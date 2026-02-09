import { ShieldCheck, UserCheck, Star, CheckCircle2 } from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';

export default function SecuritySection() {
  return (
    <section aria-labelledby="security-title" className="py-24 bg-surface overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Colonne Texte */}
          <div className="order-2 lg:order-1 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-success-50 text-success-700 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              Sécurité maximale
            </div>

            <h2 id="security-title" className="text-3xl md:text-4xl font-extrabold text-text-primary leading-tight">
              Nous prenons votre sécurité <br />
              <span className="text-success-600">très au sérieux.</span>
            </h2>

            <p className="text-lg text-text-secondary leading-relaxed">
              Chez Khadamat, nous ne laissons rien au hasard. Chaque inscription de professionnel est traitée manuellement pour garantir une communauté saine et fiable.
            </p>

            <div className="space-y-6 pt-4">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-success-100 flex items-center justify-center mt-1">
                    <span className="font-bold text-success-700 text-sm">{step.num}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary text-lg">{step.title}</h4>
                    <p className="text-text-secondary text-sm mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Colonne Visuelle — Carte Pro */}
          <div className="order-1 lg:order-2 relative flex justify-center">
            <div className="absolute inset-0 bg-primary-50 rounded-[2rem] transform translate-x-4 translate-y-4 -z-10" />

            <div className="relative bg-surface p-8 rounded-[2rem] shadow-2xl border border-border w-full max-w-md">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-8 bg-primary-100 rounded flex items-center justify-center">
                  <span className="text-primary-500 font-bold text-xs tracking-widest">PRO</span>
                </div>
                <VerifiedBadge small />
              </div>

              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-background border border-border overflow-hidden flex items-center justify-center text-text-muted">
                  <UserCheck className="w-8 h-8" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-text-primary">Karim Bennani</h3>
                  <p className="text-text-secondary text-sm">Plombier Expert &bull; Casablanca</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-warning-400 fill-current" aria-hidden="true" />
                    <span className="font-bold text-text-primary">4.9</span>
                    <span className="text-text-muted text-xs">(128 avis)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-background p-5 rounded-xl border border-border">
                {verifications.map((v) => (
                  <div key={v.label} className="flex justify-between text-sm items-center">
                    <span className="text-text-secondary font-medium">{v.label}</span>
                    <div className="flex items-center gap-1.5 text-success-600 bg-success-50 px-2 py-0.5 rounded text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> {v.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const steps = [
  { num: 1, title: "Vérification d'identité (KYC)", desc: 'Carte nationale, selfie et justificatif de domicile sont analysés pour chaque pro.' },
  { num: 2, title: 'Charte de bonne conduite', desc: "Signature obligatoire de notre charte d'engagement qualité et respect." },
  { num: 3, title: 'Suivi continu', desc: 'Un système de notation strict. Une note trop basse entraîne la suspension du compte.' },
];

const verifications = [
  { label: 'Identité (CIN)', status: 'Validée' },
  { label: 'Téléphone', status: 'Vérifié' },
  { label: 'Profil validé par Khadamat', status: 'Confirmé' },
];
