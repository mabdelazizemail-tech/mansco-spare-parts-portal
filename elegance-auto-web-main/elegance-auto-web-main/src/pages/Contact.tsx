import { useEffect, useState } from "react";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/Reveal";
import { toast } from "@/hooks/use-toast";

const Contact = () => {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Contact — Peugeot Spare Parts Egypt";
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({ title: "Request received", description: "Our parts team will be in touch within 24 hours." });
      (e.target as HTMLFormElement).reset();
    }, 700);
  };

  return (
    <>
      <section className="pt-32 md:pt-40 pb-12 container-aura">
        <Reveal>
          <p className="eyebrow mb-6">Support</p>
          <h1 className="display-xl text-balance max-w-4xl">
            We're here to<br /><span className="text-primary">help</span>.
          </h1>
        </Reveal>
      </section>

      <section className="container-aura grid gap-12 lg:grid-cols-[1.4fr_1fr] pb-24">
        <Reveal>
          <form onSubmit={onSubmit} className="bg-gradient-card border border-[hsl(var(--hairline))] p-8 md:p-10 space-y-6">
            <h2 className="font-display text-2xl font-bold uppercase">Send a request</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="firstName" className="text-xs uppercase tracking-wider mb-2 block">First Name</Label>
                <Input id="firstName" required className="bg-background border-[hsl(var(--hairline))] h-12" />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-xs uppercase tracking-wider mb-2 block">Last Name</Label>
                <Input id="lastName" required className="bg-background border-[hsl(var(--hairline))] h-12" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="email" className="text-xs uppercase tracking-wider mb-2 block">Email</Label>
                <Input id="email" type="email" required className="bg-background border-[hsl(var(--hairline))] h-12" />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs uppercase tracking-wider mb-2 block">Phone</Label>
                <Input id="phone" type="tel" className="bg-background border-[hsl(var(--hairline))] h-12" />
              </div>
            </div>
            <div>
              <Label htmlFor="vin" className="text-xs uppercase tracking-wider mb-2 block">VIN or Model</Label>
              <Input id="vin" placeholder="e.g. Peugeot 3008 2022 / VF3MJEHZRMS123456" className="bg-background border-[hsl(var(--hairline))] h-12" />
            </div>
            <div>
              <Label htmlFor="message" className="text-xs uppercase tracking-wider mb-2 block">How can we help?</Label>
              <Textarea id="message" rows={5} className="bg-background border-[hsl(var(--hairline))]" />
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
              {submitting ? "Sending..." : "Send Request"}
            </Button>
          </form>
        </Reveal>

        <Reveal delay={120}>
          <div className="space-y-6">
            <div className="border border-[hsl(var(--hairline))] p-8 bg-[hsl(var(--surface))]">
              <h3 className="font-display text-lg uppercase font-bold mb-6">Cairo Distribution Center</h3>
              <ul className="space-y-5 text-sm">
                <li className="flex gap-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Industrial Zone, 6th of October City, Giza, Egypt</span>
                </li>
                <li className="flex gap-3">
                  <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">16404 (Customer Care)</span>
                </li>
                <li className="flex gap-3">
                  <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">parts@peugeot-eg.com</span>
                </li>
                <li className="flex gap-3">
                  <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Sun–Thu · 09:00 – 19:00</span>
                </li>
              </ul>
            </div>
            <div className="border border-[hsl(var(--hairline))] p-8 bg-gradient-card">
              <h3 className="font-display text-lg uppercase font-bold mb-3">24/7 Roadside</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Continental coverage across Egypt for emergency support and recovery.
              </p>
              <p className="font-display text-2xl text-primary">19191</p>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
};

export default Contact;
