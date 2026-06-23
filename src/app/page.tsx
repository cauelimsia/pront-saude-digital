import { Navbar } from "@/components/marketing/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { Segments } from "@/components/marketing/Segments";
import { Ecosystem } from "@/components/marketing/Ecosystem";
import { WhyPront } from "@/components/marketing/WhyPront";
import { CTA } from "@/components/marketing/CTA";
import { Footer } from "@/components/marketing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Segments />
        <Ecosystem />
        <WhyPront />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
