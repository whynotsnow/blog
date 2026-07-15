<script lang="ts">
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";
	import type { SiteNoticeItemViewModel } from "@/services/site-notice";
	import { onPageLifecycle } from "@/utils/page-lifecycle";
	import {
		getUnreadSiteNoticeIds,
		isSiteNoticeDismissed,
		markSiteNoticeRead,
		SITE_NOTICE_STATE_EVENT,
	} from "./notice-state";
	import {
		collectReadingStatus,
		saveReadingPosition,
		type ReadingStatus,
	} from "./reading-status";

	type Labels = {
		activityCenter: string;
		notifications: string;
		markAllRead: string;
		noNotifications: string;
		readingStatus: string;
		readingProgress: string;
		remainingReading: string;
		currentSection: string;
		resumeReading: string;
	};

	let {
		notices = [],
		labels,
	}: { notices?: SiteNoticeItemViewModel[]; labels: Labels } = $props();

	let root: HTMLDivElement;
	let button: HTMLButtonElement;
	let open = $state(false);
	let unreadIds = $state<string[]>([]);
	let noticeRevision = $state(0);
	let reading = $state<ReadingStatus>(collectInitialReading());
	let frame: number | undefined;

	const visibleNotices = $derived.by(() => {
		void noticeRevision;
		return notices.filter((notice) => !isDismissed(notice.id));
	});
	const progressPercent = $derived(Math.round(reading.progress * 100));

	function collectInitialReading(): ReadingStatus {
		return {
			active: false,
			title: "",
			progress: 0,
			currentHeading: "",
			remainingMinutes: 0,
		};
	}

	function isDismissed(id: string) {
		return typeof window !== "undefined" && isSiteNoticeDismissed(id);
	}

	function syncNotices() {
		unreadIds = getUnreadSiteNoticeIds(notices.map((notice) => notice.id));
	}

	function syncReading() {
		if (frame) cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			reading = collectReadingStatus();
			saveReadingPosition(reading);
		});
	}

	function markAllRead() {
		for (const id of unreadIds) markSiteNoticeRead(id);
		syncNotices();
	}

	function setOpen(nextOpen: boolean) {
		open = nextOpen;
		if (open) {
			markAllRead();
			syncReading();
		}
	}

	function resumeReading() {
		if (reading.resumeScrollY === undefined) return;
		window.scrollTo({ top: reading.resumeScrollY, behavior: "smooth" });
		setOpen(false);
	}

	onMount(() => {
		syncNotices();
		syncReading();
		const handleScroll = () => syncReading();
		const handleResize = () => syncReading();
		const handleNoticeChange = () => {
			noticeRevision += 1;
			syncNotices();
		};
		const handlePointerDown = (event: PointerEvent) => {
			if (
				open &&
				event.target instanceof Node &&
				!root.contains(event.target)
			) {
				setOpen(false);
			}
		};
		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && open) {
				setOpen(false);
				button.focus();
			}
		};
		const unsubscribeContent = onPageLifecycle(
			"content-replace",
			syncReading,
		);
		const unsubscribeView = onPageLifecycle("page-view", syncReading);

		window.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("resize", handleResize);
		window.addEventListener(SITE_NOTICE_STATE_EVENT, handleNoticeChange);
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeydown);

		return () => {
			if (frame) cancelAnimationFrame(frame);
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", handleResize);
			window.removeEventListener(
				SITE_NOTICE_STATE_EVENT,
				handleNoticeChange,
			);
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeydown);
			unsubscribeContent();
			unsubscribeView();
		};
	});
</script>

<div class="activity-center" bind:this={root} data-open={open}>
	<button
		bind:this={button}
		type="button"
		id="activity-center-switch"
		class="activity-center__switch btn-plain scale-animation"
		aria-label={labels.activityCenter}
		aria-controls="activity-center-panel"
		aria-expanded={open}
		data-reading-progress={progressPercent}
		onclick={() => setOpen(!open)}
	>
		<svg
			class="activity-center__progress"
			viewBox="0 0 44 44"
			aria-hidden="true"
		>
			<circle
				class="activity-center__progress-track"
				cx="22"
				cy="22"
				r="19"
			/>
			<circle
				class="activity-center__progress-value"
				cx="22"
				cy="22"
				r="19"
				style:stroke-dashoffset={119.38 *
					(1 - (reading.active ? reading.progress : 0))}
			/>
		</svg>
		<Icon
			icon="material-symbols:notifications-outline-rounded"
			aria-hidden="true"
		/>
		{#if unreadIds.length > 0}
			<span class="activity-center__badge" data-activity-unread
				>{unreadIds.length > 9 ? "9+" : unreadIds.length}</span
			>
		{/if}
	</button>

	<div
		id="activity-center-panel"
		class="activity-center__panel"
		role="dialog"
		aria-label={labels.activityCenter}
		hidden={!open}
	>
		<header class="activity-center__header">
			<div>
				<strong>{labels.activityCenter}</strong>
				<span>{visibleNotices.length} {labels.notifications}</span>
			</div>
			{#if unreadIds.length > 0}
				<button type="button" onclick={markAllRead}
					>{labels.markAllRead}</button
				>
			{/if}
		</header>

		{#if reading.active}
			<section
				class="activity-center__section activity-center__reading"
				data-activity-reading
			>
				<div class="activity-center__section-heading">
					<Icon
						icon="material-symbols:auto-stories-outline-rounded"
						aria-hidden="true"
					/>
					<strong>{labels.readingStatus}</strong>
				</div>
				<p class="activity-center__reading-title">{reading.title}</p>
				<div class="activity-center__reading-meta">
					<span>{labels.readingProgress} {progressPercent}%</span>
					<span
						>{labels.remainingReading}
						{reading.remainingMinutes}</span
					>
				</div>
				<div class="activity-center__meter" aria-hidden="true">
					<span style:width={`${progressPercent}%`}></span>
				</div>
				{#if reading.currentHeading}
					<p class="activity-center__current-heading">
						<span>{labels.currentSection}</span>
						<strong>{reading.currentHeading}</strong>
					</p>
				{/if}
				{#if reading.resumeScrollY !== undefined}
					<button
						class="activity-center__resume"
						type="button"
						onclick={resumeReading}
					>
						<Icon
							icon="material-symbols:history-rounded"
							aria-hidden="true"
						/>
						{labels.resumeReading}
					</button>
				{/if}
			</section>
		{/if}

		<section class="activity-center__section">
			<div class="activity-center__section-heading">
				<Icon
					icon="material-symbols:notifications-outline-rounded"
					aria-hidden="true"
				/>
				<strong>{labels.notifications}</strong>
			</div>
			{#if visibleNotices.length > 0}
				<div class="activity-center__notice-list">
					{#each visibleNotices as notice (notice.id)}
						<article
							class="activity-center__notice"
							data-status={notice.status}
						>
							<Icon icon={notice.icon} aria-hidden="true" />
							<div>
								{#if notice.title}<strong>{notice.title}</strong
									>{/if}
								<p>{notice.content}</p>
								{#if notice.action}
									<a
										href={notice.action.href}
										target={notice.action.external
											? "_blank"
											: undefined}
										rel={notice.action.external
											? "noopener noreferrer"
											: undefined}
										>{notice.action.label}</a
									>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{:else}
				<p class="activity-center__empty">{labels.noNotifications}</p>
			{/if}
		</section>
	</div>
</div>
