import { describe, expect, it } from "vitest";
import { createTaskRunner } from "@/services/core/concurrency";

describe("bounded task runner", () => {
	it("never exceeds the configured concurrency", async () => {
		const run = createTaskRunner(2);
		let active = 0;
		let maximum = 0;

		const results = await Promise.all(
			Array.from({ length: 8 }, (_, value) =>
				run(async () => {
					active++;
					maximum = Math.max(maximum, active);
					await Promise.resolve();
					active--;
					return value;
				}),
			),
		);

		expect(maximum).toBe(2);
		expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	});

	it("releases capacity after a task rejects", async () => {
		const run = createTaskRunner(1);

		await expect(
			run(async () => {
				throw new Error("failed");
			}),
		).rejects.toThrow("failed");
		await expect(run(async () => "recovered")).resolves.toBe("recovered");
	});
});
