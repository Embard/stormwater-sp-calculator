import type { ValidationIssue } from '../types';

type Props = {
  issues: ValidationIssue[];
};

export function ValidationPanel({ issues }: Props) {
  const errors = issues.filter((x) => x.severity === 'error').length;
  const warnings = issues.filter((x) => x.severity === 'warning').length;

  return (
    <section className="card validation-card">
      <h2>Проверки методики</h2>
      <p className="summary">
        Ошибки: <strong>{errors}</strong>. Предупреждения: <strong>{warnings}</strong>. Информационные сообщения: <strong>{issues.length - errors - warnings}</strong>.
      </p>
      <div className="issues">
        {issues.length === 0 ? (
          <p className="ok">Критических методических замечаний не найдено.</p>
        ) : (
          issues.map((item) => (
            <article key={item.id} className={`issue ${item.severity}`}>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
