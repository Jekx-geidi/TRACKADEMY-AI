/** Small illustration of a paper with the code box in the upper-right corner. */
export function PaperGuide({ code = '55922' }: { code?: string }) {
  return (
    <div className="paper-guide" role="img" aria-label={`Example paper with code ${code} in the upper-right box`}>
      <span className="code-box">{code}</span>
      <span className="line" />
      <span className="line" style={{ width: '70%' }} />
      <span className="line" style={{ width: '85%' }} />
      <span className="line" style={{ width: '55%' }} />
    </div>
  );
}
