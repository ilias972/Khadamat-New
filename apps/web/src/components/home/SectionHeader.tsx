interface SectionHeaderProps {
  id: string;
  badge: string;
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ id, badge, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="text-center mb-12">
      <span className="inline-block text-primary-500 font-bold tracking-wide uppercase text-sm bg-primary-50 px-3 py-1 rounded-full">
        {badge}
      </span>
      <h2
        id={id}
        className="text-3xl md:text-4xl font-extrabold text-text-primary mt-4"
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
