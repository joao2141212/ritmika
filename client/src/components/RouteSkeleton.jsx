export default function RouteSkeleton({ variant = 'page', label = 'Carregando conteúdo' }) {
  return (
    <section
      className={`route-skeleton route-skeleton-${variant} grid w-full gap-5 p-[clamp(18px,3vw,34px)] max-[760px]:gap-4 max-[760px]:px-0 max-[760px]:pb-24 max-[760px]:pt-[18px]`}
      aria-busy="true"
      aria-label={label}
    >
      <span className="sr-only" role="status">{label}</span>
      <div className="grid gap-2.5" aria-hidden="true">
        <span className="block h-2.5 w-28 animate-pulse rounded-full bg-skeleton motion-reduce:animate-none motion-reduce:opacity-70" />
        <strong className="block h-[34px] w-[min(340px,72%)] animate-pulse rounded-full bg-skeleton motion-reduce:animate-none motion-reduce:opacity-70" />
        <small className="block h-[13px] w-[min(480px,90%)] animate-pulse rounded-full bg-skeleton motion-reduce:animate-none motion-reduce:opacity-70" />
      </div>
      <div className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-2" aria-hidden="true">
        {[1, 2, 3].map((item) => <span className="block h-[92px] animate-pulse rounded-[20px] bg-skeleton motion-reduce:animate-none motion-reduce:opacity-70 max-[760px]:h-[78px]" key={item} />)}
      </div>
      <div className="grid gap-3" aria-hidden="true">
        {[1, 2, 3].map((item) => (
          <article className="grid grid-cols-[46px_minmax(0,1fr)] items-center gap-2.5 rounded-[20px] border border-skeleton-border bg-white/90 p-[18px] max-[760px]:p-[15px]" key={item}>
            <i className="row-span-3 block size-[46px] animate-pulse rounded-[15px] bg-skeleton motion-reduce:animate-none motion-reduce:opacity-70" />
            <div className="grid gap-2.5">
              <strong className="block h-[15px] w-[min(260px,72%)] animate-pulse rounded-full bg-skeleton motion-reduce:animate-none motion-reduce:opacity-70" />
              <span className="block h-[11px] w-[min(420px,94%)] animate-pulse rounded-full bg-skeleton motion-reduce:animate-none motion-reduce:opacity-70" />
              <small className="block h-2.5 w-[124px] animate-pulse rounded-full bg-skeleton motion-reduce:animate-none motion-reduce:opacity-70" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
