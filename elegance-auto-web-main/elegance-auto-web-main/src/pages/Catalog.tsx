import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, ChevronRight } from "lucide-react";
import { categories, parts as allParts, getCategory } from "@/lib/catalog";
import { PartCard } from "@/components/PartCard";
import { Reveal } from "@/components/Reveal";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const Catalog = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [sort, setSort] = useState<"popular" | "price-asc" | "price-desc">("popular");

  const activeCategory = slug ? getCategory(slug) : null;

  useEffect(() => {
    document.title = activeCategory
      ? `${activeCategory.name} — Peugeot Spare Parts`
      : "Catalog — Peugeot Spare Parts";
  }, [activeCategory]);

  const filtered = useMemo(() => {
    let list = allParts;
    if (slug) list = list.filter((p) => p.categorySlug === slug);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.oem.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [slug, query, sort]);

  return (
    <>
      <section className="pt-32 md:pt-40 pb-10 container-aura">
        <Reveal>
          <nav className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/catalog" className="hover:text-foreground">Catalog</Link>
            {activeCategory && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">{activeCategory.name}</span>
              </>
            )}
          </nav>
          <p className="eyebrow mb-4">{activeCategory ? activeCategory.name : "All Categories"}</p>
          <h1 className="display-lg text-balance max-w-3xl">
            {activeCategory ? (
              <>{activeCategory.name}<br /><span className="text-primary">{activeCategory.count} references</span>.</>
            ) : (
              <>Browse the full<br /><span className="text-primary">parts catalog</span>.</>
            )}
          </h1>
          {activeCategory && (
            <p className="mt-5 text-muted-foreground max-w-xl">{activeCategory.description}</p>
          )}
        </Reveal>
      </section>

      <section className="container-aura grid gap-8 lg:grid-cols-[260px_1fr] pb-24">
        {/* Sidebar */}
        <aside className="space-y-8">
          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] font-semibold mb-4">Categories</h3>
            <ul className="space-y-1">
              <li>
                <Link
                  to="/catalog"
                  className={cn(
                    "block py-2 text-sm border-l-2 pl-3 transition-colors",
                    !slug ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  All Parts
                  <span className="text-muted-foreground ml-2">({allParts.length})</span>
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/catalog/${c.slug}`}
                    className={cn(
                      "block py-2 text-sm border-l-2 pl-3 transition-colors",
                      slug === c.slug
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.name}
                    <span className="text-muted-foreground/60 ml-2">({c.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-[hsl(var(--hairline))] p-5 bg-[hsl(var(--surface))]">
            <h3 className="text-xs uppercase tracking-[0.2em] font-semibold mb-2">Need help?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Use your VIN to find guaranteed-fit parts in seconds.
            </p>
            <Link to="/vin-finder" className="text-xs uppercase tracking-[0.2em] text-primary hover:underline">
              Open VIN Finder →
            </Link>
          </div>
        </aside>

        {/* Main */}
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 flex items-center bg-background border border-[hsl(var(--hairline))] focus-within:border-primary transition-colors">
              <Search className="h-4 w-4 text-muted-foreground ml-3" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchParams(e.target.value ? { q: e.target.value } : {});
                }}
                placeholder="Search by name, OEM or SKU"
                className="border-0 h-11 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="flex items-center gap-2 bg-background border border-[hsl(var(--hairline))] px-3">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="h-11 bg-transparent text-sm focus:outline-none pr-2"
              >
                <option value="popular">Sort: Most Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-6">
            Showing {filtered.length} {filtered.length === 1 ? "part" : "parts"}
          </p>

          {filtered.length === 0 ? (
            <div className="border border-[hsl(var(--hairline))] p-12 text-center bg-[hsl(var(--surface))]">
              <p className="font-display text-lg uppercase mb-2">No parts found</p>
              <p className="text-sm text-muted-foreground">Try a different search term or browse all categories.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <PartCard key={p.sku} part={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Catalog;
