const createLimiter = <A extends unknown[], T>(callback: (...args: A) => Promise<T>, maxConcurrent: number): (...args: A) => Promise<T> => {
  let current = 0;
  const queue: [(value: T) => void, (error: unknown) => void, A][] = [];

  const startNext = () => {
    if (current >= maxConcurrent || queue.length === 0) {
      return;
    }

    current += 1;
    // Won't be null because of length check above.
    const [resolve, reject, args] = queue.shift()!;

    callback(...args)
      .then((value) => {
        resolve(value);
        current -= 1;
        startNext();
      })
      .catch((error) => {
        reject(error);
        current -= 1;
        startNext();
      });
  };

  return (...args: A) => new Promise((resolve, reject) => {
    queue.push([resolve, reject, args]);
    startNext();
  });
};

export default createLimiter;
