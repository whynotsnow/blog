<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import { onMount } from "svelte";
	import type { SiteNoticeItemViewModel } from "@/services/site-notice";
	import { onPageLifecycle } from "@/utils/page-lifecycle";
	import {
		acknowledgeSiteNotice,
		dismissSiteNotice,
		getUnreadSiteNoticeIds,
		isSiteNoticeAcknowledged,
		isSiteNoticeDismissed,
		isSiteNoticePanelSuppressedInSession,
		isSiteNoticeRead,
		markSiteNoticeAutoOpenedInSession,
		markSiteNoticePanelAutoExpandedInSession,
		markSiteNoticeRead,
		SITE_NOTICE_STATE_EVENT,
		suppressSiteNoticePanelInSession,
		wasSiteNoticeAutoOpenedInSession,
		wasSiteNoticePanelAutoExpandedInSession,
	} from "./notice-state";
	import {
		collectReadingStatus,
		saveReadingPosition,
		type ReadingStatus,
	} from "./reading-status";

	type ClientNotice = Omit<SiteNoticeItemViewModel, "entry">;
	type NoticeFilter = "all" | "unread" | "important";

	type Labels = {
		activityCenter: string;
		notifications: string;
		markAllRead: string;
		noNotifications: string;
		noUnreadNotifications: string;
		noImportantNotifications: string;
		notificationDetails: string;
		notificationSection: string;
		notificationAll: string;
		notificationUnread: string;
		notificationImportant: string;
		notificationUnreadCount: string;
		notificationRead: string;
		notificationDismiss: string;
		notificationAcknowledge: string;
		notificationLater: string;
		notificationOpen: string;
		readingStatus: string;
		readingProgress: string;
		remainingReading: string;
		currentSection: string;
		resumeReading: string;
	};

	let { notices = [], labels }: { notices?: ClientNotice[]; labels: Labels } =
		$props();

	let root: HTMLDivElement;
	let button: HTMLButtonElement;
	let panel: HTMLDivElement;
	let dialog = $state<HTMLDivElement | undefined>();
	let dialogHost: HTMLDivElement | undefined;
	let open = $state(false);
	let unreadIds = $state<string[]>([]);
	let noticeRevision = $state(0);
	let filter = $state<NoticeFilter>("all");
	let selectedNoticeId = $state<string | undefined>();
	let dialogOpen = $state(false);
	let contentById = $state<Record<string, string>>({});
	let reading = $state<ReadingStatus>(collectInitialReading());
	let frame: number | undefined;
	let lockedScrollY = 0;
	let scrollLocked = false;
	let previousBodyStyles:
		| Pick<
				CSSStyleDeclaration,
				"overflow" | "paddingRight" | "position" | "top" | "width"
		  >
		| undefined;

	const progressPercent = $derived(Math.round(reading.progress * 100));
	const selectedNotice = $derived(
		notices.find((notice) => notice.id === selectedNoticeId),
	);
	const selectedHtml = $derived(
		selectedNoticeId ? contentById[selectedNoticeId] : "",
	);

	const visibleNotices = $derived.by(() => {
		void noticeRevision;
		return notices.filter((notice) => !isDismissed(notice.id));
	});
	const sortedNotices = $derived.by(() =>
		[...visibleNotices].sort((a, b) => {
			const rankDelta = getNoticeSortScore(b) - getNoticeSortScore(a);
			if (rankDelta !== 0) return rankDelta;
			return (b.published ?? "").localeCompare(a.published ?? "");
		}),
	);
	const filteredNotices = $derived.by(() =>
		sortedNotices.filter((notice) => {
			if (filter === "unread") return isUnread(notice.id);
			if (filter === "important") return getNoticeRank(notice) >= 2;
			return true;
		}),
	);
	const noticeCounts = $derived.by(() => {
		const unread = visibleNotices.filter((notice) =>
			isUnread(notice.id),
		).length;
		const important = visibleNotices.filter(
			(notice) => getNoticeRank(notice) >= 2,
		).length;
		return {
			all: visibleNotices.length,
			unread,
			important,
		};
	});
	const headerNoticeSummary = $derived(
		noticeCounts.unread > 0
			? `${noticeCounts.unread} ${labels.notificationUnreadCount}`
			: `${noticeCounts.all} ${labels.notifications}`,
	);
	const emptyNoticeLabel = $derived.by(() => {
		if (filter === "unread") return labels.noUnreadNotifications;
		if (filter === "important") return labels.noImportantNotifications;
		return labels.noNotifications;
	});
	const hasUrgentUnread = $derived(
		visibleNotices.some(
			(notice) => isUnread(notice.id) && getNoticeRank(notice) >= 3,
		),
	);

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

	function isRead(id: string) {
		return typeof window !== "undefined" && isSiteNoticeRead(id);
	}

	function isUnread(id: string) {
		return !isRead(id) && !isDismissed(id);
	}

	function getNoticeRank(notice: ClientNotice) {
		if (notice.level === "critical") return 4;
		if (notice.level === "urgent") return 3;
		if (notice.level === "important") return 2;
		return 1;
	}

	function needsAcknowledgement(notice: ClientNotice) {
		return (
			notice.requiresAck &&
			!isSiteNoticeAcknowledged(notice.id) &&
			!isSiteNoticeDismissed(notice.id)
		);
	}

	function getNoticeSortScore(notice: ClientNotice) {
		let score = getNoticeRank(notice) * 100;
		if (notice.pinned) score += 500;
		if (needsAcknowledgement(notice)) score += 300;
		if (isUnread(notice.id)) score += 50;
		return score;
	}

	function getNoticeStatusIcon(notice: ClientNotice) {
		if (notice.level === "critical") {
			return "material-symbols:error-outline-rounded";
		}
		if (notice.level === "urgent") {
			return "material-symbols:warning-outline-rounded";
		}
		return notice.icon;
	}

	function portal(node: HTMLElement) {
		const target = dialogHost ?? document.body;
		target.appendChild(node);
		return {
			destroy() {
				node.remove();
			},
		};
	}

	function mobilePanelPortal(node: HTMLElement) {
		const placeholder = document.createComment("activity-center-panel");
		const parent = node.parentNode;
		const media = window.matchMedia("(max-width: 767px)");

		function syncPortal() {
			if (media.matches) {
				if (node.parentNode !== document.body) {
					node.before(placeholder);
					document.body.appendChild(node);
				}
				return;
			}
			if (node.parentNode === document.body && placeholder.parentNode) {
				placeholder.parentNode.insertBefore(node, placeholder);
				placeholder.remove();
			}
		}

		syncPortal();
		media.addEventListener("change", syncPortal);

		return {
			destroy() {
				media.removeEventListener("change", syncPortal);
				if (node.parentNode === document.body && parent) {
					parent.appendChild(node);
				}
				placeholder.remove();
			},
		};
	}

	function readRenderedNoticeContent() {
		const nextContent: Record<string, string> = {};
		document
			.querySelectorAll<HTMLTemplateElement>(
				"template[data-notification-content]",
			)
			.forEach((template) => {
				const id = template.dataset.notificationContent;
				if (!id) return;
				nextContent[id] = template.innerHTML.trim();
			});
		contentById = nextContent;
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
		noticeRevision += 1;
	}

	function setOpen(nextOpen: boolean) {
		if (!nextOpen && open) suppressSiteNoticePanelInSession();
		open = nextOpen;
		if (open) syncReading();
	}

	function lockPageScroll() {
		if (scrollLocked) return;
		const scrollbarWidth =
			window.innerWidth - document.documentElement.clientWidth;
		lockedScrollY = window.scrollY;
		previousBodyStyles = {
			overflow: document.body.style.overflow,
			paddingRight: document.body.style.paddingRight,
			position: document.body.style.position,
			top: document.body.style.top,
			width: document.body.style.width,
		};
		document.body.style.overflow = "hidden";
		if (scrollbarWidth > 0) {
			document.body.style.paddingRight = `${scrollbarWidth}px`;
		}
		document.body.style.position = "fixed";
		document.body.style.top = `-${lockedScrollY}px`;
		document.body.style.width = "100%";
		scrollLocked = true;
	}

	function unlockPageScroll() {
		if (!scrollLocked || !previousBodyStyles) return;
		document.body.style.overflow = previousBodyStyles.overflow;
		document.body.style.paddingRight = previousBodyStyles.paddingRight;
		document.body.style.position = previousBodyStyles.position;
		document.body.style.top = previousBodyStyles.top;
		document.body.style.width = previousBodyStyles.width;
		scrollLocked = false;
		previousBodyStyles = undefined;
		window.scrollTo(0, lockedScrollY);
	}

	function openNotice(notice: ClientNotice, auto = false) {
		try {
			selectedNoticeId = notice.id;
			dialogOpen = true;
			open = false;
			lockPageScroll();
			markSiteNoticeRead(notice.id);
			syncNotices();
			noticeRevision += 1;
			requestAnimationFrame(() => {
				dialog?.focus();
			});
			if (auto) {
				markSiteNoticeAutoOpenedInSession(notice.id);
				document.documentElement.dataset.notificationModal =
					notice.level;
			}
		} catch (error) {
			console.error(
				"Activity Center failed to open notification:",
				error,
			);
			dialogOpen = false;
			selectedNoticeId = undefined;
			unlockPageScroll();
		}
	}

	function closeDialog() {
		dialogOpen = false;
		delete document.documentElement.dataset.notificationModal;
		unlockPageScroll();
		requestAnimationFrame(() => button?.focus());
	}

	function acknowledgeSelected() {
		if (!selectedNotice) return;
		acknowledgeSiteNotice(selectedNotice.id);
		syncNotices();
		noticeRevision += 1;
		closeDialog();
	}

	function dismissSelected() {
		if (!selectedNotice || !selectedNotice.dismissible) return;
		dismissSiteNotice(selectedNotice.id);
		syncNotices();
		noticeRevision += 1;
		closeDialog();
	}

	function handleActionClick() {
		if (!selectedNotice) return;
		if (selectedNotice.requiresAck) {
			acknowledgeSiteNotice(selectedNotice.id);
		} else {
			markSiteNoticeRead(selectedNotice.id);
		}
		syncNotices();
		noticeRevision += 1;
	}

	function maybeOpenCriticalNotice() {
		const autoOpenNotice = sortedNotices.find((notice) => {
			if (!notice.pinned && notice.level !== "critical") return false;
			if (wasSiteNoticeAutoOpenedInSession(notice.id)) return false;
			if (isSiteNoticeDismissed(notice.id)) return false;
			if (notice.requiresAck) {
				return !isSiteNoticeAcknowledged(notice.id);
			}
			return !isSiteNoticeRead(notice.id);
		});
		if (!autoOpenNotice) return false;
		openNotice(autoOpenNotice, true);
		return true;
	}

	function maybeAutoExpandImportantNotices() {
		if (
			open ||
			dialogOpen ||
			wasSiteNoticePanelAutoExpandedInSession() ||
			isSiteNoticePanelSuppressedInSession()
		) {
			return;
		}
		const hasImportantUnread = sortedNotices.some(
			(notice) =>
				isUnread(notice.id) &&
				(notice.level === "important" || notice.level === "urgent"),
		);
		if (!hasImportantUnread) return;
		open = true;
		markSiteNoticePanelAutoExpandedInSession();
		syncReading();
	}

	function resumeReading() {
		if (reading.resumeScrollY === undefined) return;
		window.scrollTo({ top: reading.resumeScrollY, behavior: "smooth" });
		setOpen(false);
	}

	onMount(() => {
		dialogHost = document.createElement("div");
		dialogHost.dataset.activityCenterPortal = "";
		document.body.appendChild(dialogHost);
		readRenderedNoticeContent();
		syncNotices();
		syncReading();
		if (!maybeOpenCriticalNotice()) maybeAutoExpandImportantNotices();

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
				!root.contains(event.target) &&
				!panel?.contains(event.target)
			) {
				setOpen(false);
			}
		};
		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				if (dialogOpen) closeDialog();
				else if (open) {
					setOpen(false);
					button.focus();
				}
			}
		};
		const unsubscribeContent = onPageLifecycle("content-replace", () => {
			readRenderedNoticeContent();
			syncReading();
			if (!maybeOpenCriticalNotice()) maybeAutoExpandImportantNotices();
		});
		const unsubscribeView = onPageLifecycle("page-view", syncReading);

		window.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("resize", handleResize);
		window.addEventListener(SITE_NOTICE_STATE_EVENT, handleNoticeChange);
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeydown);

		return () => {
			unlockPageScroll();
			dialogHost?.remove();
			dialogHost = undefined;
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
		data-urgent={hasUrgentUnread}
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
		<LocalIcon name="material-symbols:notifications-outline-rounded" />
		{#if unreadIds.length > 0}
			<span class="activity-center__badge" data-activity-unread
				>{unreadIds.length > 9 ? "9+" : unreadIds.length}</span
			>
		{/if}
	</button>

	<div
		bind:this={panel}
		use:mobilePanelPortal
		id="activity-center-panel"
		class="activity-center__panel"
		role="dialog"
		aria-label={labels.activityCenter}
		hidden={!open}
	>
		<header class="activity-center__header">
			<div>
				<strong>{labels.activityCenter}</strong>
				<span>{headerNoticeSummary}</span>
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
					<LocalIcon
						name="material-symbols:auto-stories-outline-rounded"
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
						<LocalIcon name="material-symbols:history-rounded" />
						{labels.resumeReading}
					</button>
				{/if}
			</section>
		{/if}

		<section class="activity-center__section">
			<div class="activity-center__section-heading">
				<LocalIcon
					name="material-symbols:notifications-outline-rounded"
				/>
				<strong>{labels.notificationSection}</strong>
			</div>
			<div class="activity-center__filters">
				<button
					type="button"
					aria-pressed={filter === "all"}
					onclick={() => (filter = "all")}
				>
					<span>{labels.notificationAll}</span>
					<small>{noticeCounts.all}</small>
				</button>
				<button
					type="button"
					aria-pressed={filter === "unread"}
					onclick={() => (filter = "unread")}
				>
					<span>{labels.notificationUnread}</span>
					<small>{noticeCounts.unread}</small>
				</button>
				<button
					type="button"
					aria-pressed={filter === "important"}
					onclick={() => (filter = "important")}
				>
					<span>{labels.notificationImportant}</span>
					<small>{noticeCounts.important}</small>
				</button>
			</div>
			{#if filteredNotices.length > 0}
				<div class="activity-center__notice-list">
					{#each filteredNotices as notice (notice.id)}
						<article
							class="activity-center__notice"
							data-status={notice.status}
							data-level={notice.level}
							data-read={!isUnread(notice.id)}
						>
							<LocalIcon name={getNoticeStatusIcon(notice)} />
							<button
								type="button"
								class="activity-center__notice-main"
								aria-label={`${labels.notificationOpen}: ${notice.title}`}
								onclick={() => openNotice(notice)}
							>
								<span class="activity-center__notice-title">
									<strong>{notice.title}</strong>
									{#if isUnread(notice.id)}
										<i
											aria-label={labels.notificationUnread}
										></i>
									{/if}
								</span>
								<p>{notice.summary}</p>
							</button>
							{#if notice.dismissible}
								<button
									type="button"
									class="activity-center__notice-dismiss"
									aria-label={`${labels.notificationDismiss}: ${notice.title}`}
									onclick={() => dismissSiteNotice(notice.id)}
								>
									<LocalIcon
										name="material-symbols:close-rounded"
									/>
								</button>
							{/if}
						</article>
					{/each}
				</div>
			{:else}
				<p class="activity-center__empty">{emptyNoticeLabel}</p>
			{/if}
		</section>
	</div>
</div>

{#if dialogOpen && selectedNotice}
	<div
		use:portal
		class="activity-center__dialog-backdrop"
		data-level={selectedNotice.level}
		role="presentation"
		onpointerdown={(event) => {
			if (event.target === event.currentTarget) closeDialog();
		}}
	>
		<div
			bind:this={dialog}
			class="activity-center__dialog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="activity-center-dialog-title"
			tabindex="-1"
			data-status={selectedNotice.status}
			data-level={selectedNotice.level}
		>
			<header class="activity-center__dialog-header">
				<LocalIcon name={getNoticeStatusIcon(selectedNotice)} />
				<div>
					<span>{labels.notificationDetails}</span>
					<h2 id="activity-center-dialog-title">
						{selectedNotice.title}
					</h2>
				</div>
				<button
					type="button"
					class="activity-center__dialog-close"
					aria-label={labels.notificationLater}
					onclick={closeDialog}
				>
					<LocalIcon name="material-symbols:close-rounded" />
				</button>
			</header>
			<div class="activity-center__dialog-content">
				<!-- Notification Markdown is rendered at build time from trusted local content. -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html selectedHtml}
			</div>
			<footer class="activity-center__dialog-actions">
				{#if selectedNotice.action}
					<a
						href={selectedNotice.action.href}
						target={selectedNotice.action.external
							? "_blank"
							: undefined}
						rel={selectedNotice.action.external
							? "noopener noreferrer"
							: undefined}
						onclick={handleActionClick}
						>{selectedNotice.action.label}</a
					>
				{/if}
				{#if selectedNotice.dismissible}
					<button type="button" onclick={dismissSelected}
						>{labels.notificationDismiss}</button
					>
				{/if}
				<button
					type="button"
					class="activity-center__dialog-primary"
					onclick={selectedNotice.requiresAck
						? acknowledgeSelected
						: closeDialog}
				>
					{selectedNotice.requiresAck
						? labels.notificationAcknowledge
						: labels.notificationRead}
				</button>
			</footer>
		</div>
	</div>
{/if}
