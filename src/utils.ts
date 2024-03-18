export async function parallelProcessor<T, R>(
  arr: T[],
  fn: (element: T) => Promise<R>,
  threads: number = 2,
): Promise<R[]> {
  const result: R[] = [];

  let processedCount = 0;
  const totalItems = arr.length;
  while (arr.length > 0) {
    const batch = arr.splice(0, threads);
    const res = await Promise.all(batch.map((x) => fn(x)));
    result.push(...res);

    processedCount += batch.length;

    console.log(`processed ${processedCount} of ${totalItems}`);
  }
  return result;
}

export async function asyncFilter<T>(
  arr: T[],
  predicate: (node: T) => Promise<boolean>,
): Promise<T[]> {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_v, index) => results[index]);
}
