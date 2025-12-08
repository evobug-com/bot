/**
 * Generate a cryptographically secure random index using rejection sampling.
 * This avoids the bias that occurs when using division/modulo on random values.
 *
 * @param length - The upper bound (exclusive) for the random index
 * @returns A uniformly distributed random integer in [0, length)
 */
export function getSecureRandomIndex(length: number): number {
	if (length <= 1) return 0;
	const MAX_UINT32 = 0xffffffff;
	const limit = MAX_UINT32 - (MAX_UINT32 % length);
	const array = new Uint32Array(1);
	let randomValue: number;
	do {
		crypto.getRandomValues(array);
		randomValue = array[0]!;
	} while (randomValue >= limit);
	return randomValue % length;
}
