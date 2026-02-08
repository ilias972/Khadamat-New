import type { Metadata } from 'next';
import Navbar from '../components/Navbar';
import Hero from '../components/home/Hero';
import TrustStrip from '../components/home/TrustStrip';
import Categories from '../components/home/Categories';
import FeaturedPros from '../components/home/FeaturedPros';
import Testimonials from '../components/home/Testimonials';
import HowItWorks from '../components/home/HowItWorks';
import PricingSection from '../components/home/PricingSection';
import SecuritySection from '../components/home/SecuritySection';
import ProCTA from '../components/home/ProCTA';
import Footer from '../components/home/Footer';

export const metadata: Metadata = {
  title: 'Khadamat — Trouvez un professionnel de confiance au Maroc',
  description:
    'Plomberie, électricité, ménage, climatisation… des pros vérifiés et disponibles dans votre ville.',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans text-text-primary">
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <Categories />
        <FeaturedPros />
        <Testimonials />
        <HowItWorks />
        <PricingSection />
        <SecuritySection />
        <ProCTA />
      </main>
      <Footer />
    </div>
  );
}
