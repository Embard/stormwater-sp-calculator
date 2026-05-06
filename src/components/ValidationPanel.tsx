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
  const visibleIssues = issues.filter((issue) => issue.severity !== 'info');
  const errors = visibleIssues.filter((issue) => issue.severity === 'error').length;
  const warnings = visibleIssues.filter((issue) => issue.severity === 'warning').length;
  const sortedIssues = [...visibleIssues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const importantIssues = sortedIssues.slice(0, 3);
  const remainingIssues = sortedIssues.slice(3);

  return (
    <section className="card validation-card">
      <div className="section-head compact-head">
        <div>
          <h2>Проверки методики</h2>
          <p className="section-subtitle">Ошибки: <strong>{errors}</strong> · Предупреждения: <strong>{warnings}</strong></p>
        </div>
      </div>

      {visibleIssues.length === 0 ? (
        <p className="ok">Критических и важных предупреждений не найдено.</p>
      ) : (
        <div className="issues compact-issues">
          {importantIssues.map((item) => <IssueCard key={item.id} item={item} />)}
        </div>
      )}

      {remainingIssues.length > 0 ? (
        <details className="details-panel validation-details">
          <summary>Показать все предупреждения ({visibleIssues.length})</summary>
          <div className="issues">
            {remainingIssues.map((item) => <IssueCard key={item.id} item={item} />)}
          </div>
        </details>
      ) : null}
    </section>
  );
}
