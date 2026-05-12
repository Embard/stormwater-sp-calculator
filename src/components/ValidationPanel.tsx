import type { ValidationIssue } from '../types';

type Props = {
  issues: ValidationIssue[];
};

export function ValidationPanel({ issues }: Props) {
  const visibleIssues = issues.filter((item) => item.severity !== 'info');
  const errors = visibleIssues.filter((item) => item.severity === 'error').length;
  const warnings = visibleIssues.filter((item) => item.severity === 'warning').length;

  return (
    <section className="card validation-card">
      <h2>Проверки методики</h2>
      <p className="summary">
        Ошибки: <strong>{errors}</strong>. Предупреждения: <strong>{warnings}</strong>.
      </p>
      <div className="issues">
        {visibleIssues.length === 0 ? (
          <p className="ok">Критических методических замечаний не найдено.</p>
        ) : (
          visibleIssues.map((item) => (
            <article key={item.id} className={`issue ${item.severity}`}>
              <span className="issue-type">{item.severity === 'error' ? 'Ошибка' : 'Предупреждение'}</span>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
