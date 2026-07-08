import DOMPurify from 'isomorphic-dompurify';

interface Feature {
  title: string;
  desc: string;
}

interface ProductDescriptionProps {
  title: string;
  description: string;
  features: Feature[];
}

export default function ProductDescription({
  title,
  description,
  features,
}: ProductDescriptionProps) {
  return (
    <div className="space-y-8 bg-card p-5 rounded-2xl">
      {/* 설명 텍스트 */}
      <div>
        <h2 className="text-base font-bold text-dark-text mb-2 text-h2 text-center">{title}</h2>
        <div
          className="text-sm text-gray-text leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
        />
      </div>

      {/* 특징 카드 — 번호 원형 아이콘 */}
      {features.length > 0 && (
        <div className="grid grid-cols-1 tablet:grid-cols-3 gap-4">
          {features.map(({ title: featureTitle, desc }, idx) => (
            <div key={featureTitle} className="rounded-xl p-4 bg-hover flex flex-col gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <p className="text-sm font-semibold text-dark-text">{featureTitle}</p>
              <p className="text-xs text-gray-text leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
