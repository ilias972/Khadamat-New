interface Props {
  icon: React.ReactNode;
  title: string;
  message: string;
}

export default function EmptyState({ icon, title, message }: Props) {
  return (
    <div className="py-12 text-center">
      <div className="
        w-14 h-14 mx-auto mb-4 rounded-xl
        bg-background flex items-center justify-center
        text-text-muted
      ">
        {icon}
      </div>

      <h3 className="text-lg font-bold text-text-primary mb-1">
        {title}
      </h3>

      <p className="text-text-secondary text-sm">
        {message}
      </p>
    </div>
  );
}
