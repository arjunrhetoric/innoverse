import Link from "next/link";
import { GithubIcon as Github, TwitterIcon as Twitter, LinkedinIcon as Linkedin, InstagramIcon as Instagram } from "@/components/ui/icons";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
                <span className="text-background font-bold text-[13px]">I</span>
              </div>
              <span className="text-[15px] font-semibold tracking-tight">INNOVERSE</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connecting student talent with startup innovation. Where ideas meet execution.
            </p>
            <div className="flex gap-3 mt-4">
              {[
                { icon: Twitter, href: "#" },
                { icon: Linkedin, href: "#" },
                { icon: Instagram, href: "#" },
                { icon: Github, href: "#" },
              ].map(({ icon: Icon, href }, i) => (
                <Link
                  key={i}
                  href={href}
                  className="h-9 w-9 rounded-md bg-white/[0.03] border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors duration-100"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">
              Platform
            </h4>
            <ul className="space-y-2.5">
              {["Features", "How It Works", "For Students", "For Startups"].map(
                (item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-100"
                    >
                      {item}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">
              Resources
            </h4>
            <ul className="space-y-2.5">
              {["Documentation", "Blog", "Support", "Privacy Policy"].map(
                (item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-100"
                    >
                      {item}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">
              Stay Updated
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Get the latest news and updates.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                className="h-9 text-sm"
              />
              <Button size="sm" variant="default" className="shrink-0">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} INNOVERSE. All rights reserved.</p>
          <p>
            Built by{" "}
            <Link
              href="https://github.com/arjunrhetoric"
              target="_blank"
              className="text-primary hover:underline"
            >
              Arjun Singh
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
