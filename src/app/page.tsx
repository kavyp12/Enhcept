import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import { Partnership, Divisions, HowWeWork, Stack, Clients, Faq, Contact, Footer } from "@/components/sections";
import { AiModel, RealWork } from "@/components/work";
import "@/components/site.css";
import "@/components/sections.css";

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        <Hero />
        <Partnership />
        <Divisions />
        <AiModel />
        <RealWork />
        <HowWeWork />
        <Stack />
        <Clients />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
