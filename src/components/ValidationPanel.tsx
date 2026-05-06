import type { ValidationIssue } from '../types';

type Props = {
  issues: ValidationIssue[];
};

const severityOrder: Record<ValidationIssue['severity'], number> = {
  error: 0,
  warning: 1,
  info: 2
};

const severityLabel: Record<ValidationIssue['severity'], string> = {
  error: 'Ошибка',
  warning: 'Предупреждение',
  info: 'Инфо'
};

function IssueCard({ item }: { item: ValidationIssue }) {
  return (
    <article className={`issue ${item.severity}`}>
      <span className="issue-type">{severityLabel[item.severity]}</span>
      <strong>{item.title}</strong>
      <p>{item.message}</p>
    </article>
  );
}

export function ValidationPanel({ issues }: Props) {
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  const info = issues.length - errors - warnings;
  const sortedIssues = [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const importantIssues = sortedIssues.slice(0, 3);
  const remainingIssues = sortedIssues.slice(3);

  return (
    <section className="card validation-card">
      <div className="section-head compact-head">
        <div>
          <h2>Проверки методики</h2>
          <p className="section-subtitle">Ошибки: <strong>{errors}</strong> · Предупреждения: <strong>{warnings}</strong> · Инфо: <strong>{info}</strong></p>
        </div>
      </div>

      {issues.length === 0 ? (
        <p className="ok">Критических методических замечаний не найдено.</p>
      ) : (
        <div className="issues compact-issues">
          {importantIssues.map((item) => <IssueCard key={item.id} item={item} />)}
        </div>
      )}

      {remainingIssues.length > 0 ? (
        <details className="details-panel validation-details">
          <summary>Показать все проверки ({issues.length})</summary>
          <div className="issues">
            {remainingIssues.map((item) => <IssueCard key={item.id} item={item} />)}
          </div>
        </details>
      ) : null}
    </section>
  );
}
