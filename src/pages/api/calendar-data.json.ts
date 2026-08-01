import { getCalendarData } from "@/services/calendar";

export async function GET(): Promise<Response> {
	const allPostsData = await getCalendarData();

	return new Response(JSON.stringify(allPostsData), {
		headers: {
			"Content-Type": "application/json",
		},
	});
}
