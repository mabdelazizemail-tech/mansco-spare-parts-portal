export const Marquee = () => {
  const items = ["Genuine Peugeot Parts", "Manufacturer Warranty", "Nationwide Shipping", "Authorized Distributor", "Stellantis Group"];
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div className="bg-primary text-primary-foreground border-y border-primary/50 overflow-hidden">
      <div className="flex marquee whitespace-nowrap py-3.5">
        {repeated.map((t, i) => (
          <span key={i} className="px-8 text-xs uppercase tracking-[0.3em] font-semibold flex items-center gap-8">
            {t}
            <span className="inline-block h-1 w-1 rounded-full bg-primary-foreground/60" />
          </span>
        ))}
      </div>
    </div>
  );
};
