import { Card, CardContent } from '@/components/ui/card';

interface StatusCardItem {
  label: string;
  count: number;
  filterValue: string;
}

interface StatusCardsProps<T extends string> {
  cards: StatusCardItem[];
  status: T;
  onStatusChange: (value: T) => void;
  colorMap: Record<string, string>;
  cols?: number;
  unit?: '건' | '원';
}

const GRID_COLS_MAP: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
};

const MOBILE_GRID_COLS_MAP: Record<number, string> = {
  2: 'max-mobile:grid-cols-2',
  3: 'max-mobile:grid-cols-3',
  4: 'max-mobile:grid-cols-2',
  5: 'max-mobile:grid-cols-3',
  6: 'max-mobile:grid-cols-3',
  7: 'max-mobile:grid-cols-3',
};

export default function StatusCards<T extends string>({
  cards,
  status,
  onStatusChange,
  colorMap,
  cols = 5,
  unit = '건',
}: StatusCardsProps<T>) {
  const gridColsClass = GRID_COLS_MAP[cols] ?? 'grid-cols-5';
  const mobileGridColsClass = MOBILE_GRID_COLS_MAP[cols] ?? 'max-mobile:grid-cols-3';

  return (
    <div className={`grid ${gridColsClass} ${mobileGridColsClass} gap-4 max-mobile:gap-3 mb-5`}>
      {cards.map((item) => (
        <Card
          key={item.label}
          className={`cursor-pointer ${status === item.filterValue ? 'ring-2 ring-primary' : ''}`}
          onClick={() => {
            const newFilter = item.filterValue as T;
            onStatusChange(status === newFilter ? ('전체' as T) : newFilter);
          }}
        >
          <CardContent className="py-2">
            <p className="text-sm text-gray-500 mb-2">{item.label}</p>
            <p className={`text-2xl font-bold ${colorMap[item.label] ?? 'text-gray-800'}`}>
              {item.count.toLocaleString()}
              {unit}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
