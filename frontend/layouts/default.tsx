

import { Head } from "./head";

import { Navbar } from "@/components/navbar";
import Sparklers from "@/components/Sparklers";
import Typewriter from "@/components/Typewriter";
import Cards from "@/components/Cards";
import Animation from "@/components/Animation";
import Effect from "@/components/Effect";
import GitHub from "@/components/GitHub";
import Footer from "@/components/Footer";
export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Head />
      <Navbar />
      
    <Sparklers/>
   <Typewriter/>
    <Cards/>
    <Animation/>
    <Effect/>
    <GitHub/>
    <Footer/>
    </div>
  );
}
