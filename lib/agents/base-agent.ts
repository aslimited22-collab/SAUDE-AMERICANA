import { getServiceSupabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentType =
  | "qualification"
  | "prescription"
  | "billing"
  | "support"
  | "followup";

export type TaskStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "escalated";

export interface AuditEntry {
  actor_type: "agent" | "admin" | "system" | "patient" | "provider";
  actor_id: string;
  actor_ip?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  phi_accessed?: boolean;
  success?: boolean;
  error_message?: string;
  patient_id?: string;
}

export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  escalated?: boolean;
  escalationReason?: string;
  taskId?: string;
}

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1_000,
  backoffFactor: 2,
  maxDelayMs: 30_000,
};

// ─── Sleep Helper ─────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Base Agent Class ─────────────────────────────────────────────────────────
export abstract class BaseAgent {
  readonly agentType: AgentType;
  readonly agentName: string;

  constructor(agentType: AgentType, agentName: string) {
    this.agentType = agentType;
    this.agentName = agentName;
  }

  // ── Audit Logging ─────────────────────────────────────────────────────────
  async log(entry: AuditEntry): Promise<void> {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from("audit_logs").insert({
      actor_type: entry.actor_type,
      actor_id: entry.actor_id ?? this.agentName,
      actor_ip: entry.actor_ip,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      details: entry.details ?? {},
      phi_accessed: entry.phi_accessed ?? false,
      success: entry.success ?? true,
      error_message: entry.error_message,
      patient_id: entry.patient_id,
    });

    if (error) {
      // Log to stderr but never throw — audit failures must not block operations
      console.error(`[${this.agentName}] AUDIT LOG FAILURE:`, error.message);
    }
  }

  // ── Task Management ───────────────────────────────────────────────────────
  async createTask(
    taskType: string,
    payload: Record<string, unknown>,
    options?: {
      priority?: number;
      scheduledFor?: Date;
      maxAttempts?: number;
      leadId?: string;
    }
  ): Promise<string> {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("agent_tasks")
      .insert({
        agent_type: this.agentType,
        task_type: taskType,
        payload,
        status: "pending",
        priority: options?.priority ?? 5,
        max_attempts: options?.maxAttempts ?? 3,
        scheduled_for: options?.scheduledFor?.toISOString() ?? new Date().toISOString(),
        lead_id: options?.leadId,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create task: ${error.message}`);
    return data.id as string;
  }

  async updateTask(
    taskId: string,
    updates: Partial<{
      status: TaskStatus;
      result: unknown;
      last_error: string;
      escalated: boolean;
      escalation_reason: string;
      started_at: string;
      completed_at: string;
    }>
  ): Promise<void> {
    const supabase = getServiceSupabase();
    await supabase.from("agent_tasks").update(updates).eq("id", taskId);
  }

  // ── Escalation ────────────────────────────────────────────────────────────
  async escalate(
    taskId: string | null,
    reason: string,
    context: Record<string, unknown>,
    patientId?: string
  ): Promise<void> {
    if (taskId) {
      await this.updateTask(taskId, {
        status: "escalated",
        escalated: true,
        escalation_reason: reason,
      });
    }

    await this.log({
      actor_type: "agent",
      actor_id: this.agentName,
      action: "escalate_to_human",
      details: { reason, context, task_id: taskId },
      phi_accessed: false,
      success: true,
      patient_id: patientId,
    });

    // Notify admin via Supabase realtime / email
    // In production: push to a Slack webhook or PagerDuty
    const supabase = getServiceSupabase();
    await supabase.from("agent_tasks").insert({
      agent_type: "system",
      task_type: "human_escalation",
      payload: {
        original_task_id: taskId,
        agent: this.agentName,
        reason,
        context,
        patient_id: patientId,
      },
      status: "pending",
      priority: 1, // Highest priority
    });
  }

  // ── Retry Wrapper ─────────────────────────────────────────────────────────
  async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    taskId?: string
  ): Promise<T> {
    const opts = { ...DEFAULT_RETRY, ...options };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < opts.maxAttempts) {
          const delay = Math.min(
            opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1),
            opts.maxDelayMs
          );

          console.warn(
            `[${this.agentName}] Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`
          );

          if (taskId) {
            await this.updateTask(taskId, {
              last_error: `Attempt ${attempt}: ${lastError.message}`,
            });
          }

          await sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  // ── Safe Execute ──────────────────────────────────────────────────────────
  // Wraps execution with full logging and error handling
  async safeExecute<T>(
    operation: () => Promise<T>,
    context: {
      action: string;
      resource_type?: string;
      resource_id?: string;
      patient_id?: string;
      phi_accessed?: boolean;
      taskId?: string;
    }
  ): Promise<AgentResult<T>> {
    if (context.taskId) {
      await this.updateTask(context.taskId, {
        status: "processing",
        started_at: new Date().toISOString(),
      });
    }

    try {
      const result = await operation();

      await this.log({
        actor_type: "agent",
        actor_id: this.agentName,
        action: context.action,
        resource_type: context.resource_type,
        resource_id: context.resource_id,
        phi_accessed: context.phi_accessed ?? false,
        success: true,
        patient_id: context.patient_id,
      });

      if (context.taskId) {
        await this.updateTask(context.taskId, {
          status: "completed",
          result: result as Record<string, unknown>,
          completed_at: new Date().toISOString(),
        });
      }

      return { success: true, data: result, taskId: context.taskId };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      await this.log({
        actor_type: "agent",
        actor_id: this.agentName,
        action: context.action,
        resource_type: context.resource_type,
        resource_id: context.resource_id,
        phi_accessed: context.phi_accessed ?? false,
        success: false,
        error_message: error.message,
        patient_id: context.patient_id,
      });

      if (context.taskId) {
        await this.updateTask(context.taskId, {
          status: "failed",
          last_error: error.message,
        });
      }

      return { success: false, error: error.message, taskId: context.taskId };
    }
  }
}
