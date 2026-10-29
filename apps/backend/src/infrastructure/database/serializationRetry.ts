const serializationFailureCode = '40001';

const isSerializationFailure = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if ('code' in error && error.code === serializationFailureCode) {
    return true;
  }

  // Drizzle wraps driver errors, the original pg error is available as `cause`.
  return 'cause' in error && isSerializationFailure(error.cause);
};

// Serializable transactions may be aborted by Postgres when they race on the same rows.
// Such failures are expected and safe to retry from scratch.
export const withSerializationRetry = async <T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxAttempts || !isSerializationFailure(error)) {
        throw error;
      }
    }
  }
};
