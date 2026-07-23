import { Skeleton } from '@/components/ui/skeleton';

export default function ProductosLoading() {
  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-2 rounded-md border p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </main>
  );
}
