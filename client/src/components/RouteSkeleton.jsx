import './route-skeleton.css';

export default function RouteSkeleton({ variant = 'page', label = 'Carregando conteúdo' }) {
  return (
    <section className={`route-skeleton route-skeleton-${variant}`} aria-busy="true" aria-label={label}>
      <span className="route-skeleton-status" role="status">{label}</span>
      <div className="route-skeleton-heading" aria-hidden="true">
        <span />
        <strong />
        <small />
      </div>
      <div className="route-skeleton-metrics" aria-hidden="true">
        {[1, 2, 3].map((item) => <span key={item} />)}
      </div>
      <div className="route-skeleton-content" aria-hidden="true">
        {[1, 2, 3].map((item) => <article key={item}><i /><div><strong /><span /><small /></div></article>)}
      </div>
    </section>
  );
}
