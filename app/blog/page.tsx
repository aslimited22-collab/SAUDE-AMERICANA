import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { NavBar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog — GLP-1 Weight Loss Insights | SlimRx",
  description:
    "Expert articles on GLP-1 medications, weight loss science, and telehealth. Learn about Ozempic, Wegovy, Mounjaro, and more from licensed providers.",
  openGraph: {
    title: "SlimRx Blog — GLP-1 & Weight Loss Education",
    description:
      "Expert articles on GLP-1 medications, weight loss science, and telehealth.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <NavBar />
      <main className="flex-1">
        {/* Hero */}
        <Section className="bg-gradient-to-b from-brand-gray to-white">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-teal-light px-4 py-1.5 text-sm font-medium text-brand-teal-dark">
                <BookOpen className="size-4" />
                SlimRx Blog
              </div>
              <h1 className="mt-4 font-heading text-4xl font-bold text-brand-navy md:text-5xl">
                GLP-1 & Weight Loss Insights
              </h1>
              <p className="mt-4 text-lg text-brand-gray-dark">
                Evidence-based articles from our team of licensed providers —
                helping you make informed decisions about your health.
              </p>
            </div>
          </Container>
        </Section>

        {/* Posts grid */}
        <Section>
          <Container>
            {posts.length === 0 ? (
              <p className="text-center text-brand-gray-dark">
                No posts yet. Check back soon!
              </p>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <article
                    key={post.slug}
                    className="group flex flex-col rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    {/* Card color bar */}
                    <div className="h-2 rounded-t-2xl bg-gradient-to-r from-brand-teal to-brand-teal-dark" />

                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{post.category}</Badge>
                        <span className="flex items-center gap-1 text-xs text-brand-gray-dark">
                          <Clock className="size-3" />
                          {post.readTime}
                        </span>
                      </div>

                      <h2 className="mt-3 text-lg font-bold leading-snug text-brand-navy group-hover:text-brand-teal-dark">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h2>

                      <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-gray-dark">
                        {post.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t pt-4">
                        <span className="text-xs text-brand-gray-dark">
                          {post.author} &bull;{" "}
                          {new Date(post.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="flex items-center gap-1 text-sm font-medium text-brand-teal hover:text-brand-teal-dark"
                        >
                          Read <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Container>
        </Section>

        {/* CTA */}
        <Section className="bg-brand-navy">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-bold text-white">
                Ready to start your journey?
              </h2>
              <p className="mt-3 text-brand-gray">
                Take our 2-minute assessment and see if you qualify for a
                doctor-guided GLP-1 program.
              </p>
              <Link
                href="/intake"
                className="mt-6 inline-block rounded-xl bg-brand-teal px-8 py-3 font-semibold text-brand-navy transition-colors hover:bg-brand-teal-dark"
              >
                Get Started Free
              </Link>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
