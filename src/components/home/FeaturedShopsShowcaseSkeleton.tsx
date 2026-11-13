export function FeaturedShopsShowcaseSkeleton() {
  return (
    <section
      className="bg-marketplace-featured-shops py-10 md:py-12 lg:py-14"
      aria-hidden
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[minmax(13rem,0.82fr)_minmax(0,2.8fr)] lg:items-end lg:gap-8 xl:gap-10">
          <div className="space-y-4 lg:pb-3">
            <div className="h-3 w-28 animate-pulse rounded bg-[#e4d7c8]" />
            <div className="h-28 w-full max-w-[18rem] animate-pulse rounded-lg bg-[#eae5df]" />
            <div className="h-11 w-36 animate-pulse rounded-full bg-[#eae5df]" />
          </div>
          <div className="-mx-4 grid grid-flow-col auto-cols-[minmax(15rem,78vw)] gap-3 overflow-hidden px-4 pb-3 sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 sm:gap-4 sm:px-0">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <div className="aspect-[0.82] animate-pulse bg-[#eae5df]" />
                <div className="relative min-h-[6.4rem] p-4 pt-3.5">
                  <div className="absolute -top-8 right-3 size-[4.35rem] animate-pulse rounded-full border-4 border-white bg-[#ded8d1]" />
                  <div className="h-5 w-28 animate-pulse rounded bg-[#eae5df]" />
                  <div className="mt-2 h-3 w-36 animate-pulse rounded bg-[#f0ece7]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
