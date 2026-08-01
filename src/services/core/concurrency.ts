export type TaskRunner = <T>(task: () => Promise<T>) => Promise<T>;

export function createTaskRunner(limit: number): TaskRunner {
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error(
			`Concurrency limit must be a positive integer: ${limit}`,
		);
	}

	let active = 0;
	const waiting: Array<() => void> = [];

	async function acquire(): Promise<void> {
		if (active < limit) {
			active++;
			return;
		}

		await new Promise<void>((resolve) => waiting.push(resolve));
		active++;
	}

	function release(): void {
		active--;
		waiting.shift()?.();
	}

	return async function run<T>(task: () => Promise<T>): Promise<T> {
		await acquire();
		try {
			return await task();
		} finally {
			release();
		}
	};
}

export const runPostBuildTask: TaskRunner = createTaskRunner(4);
