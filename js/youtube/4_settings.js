const ytBindWorldBookBtn = document.getElementById('yt-bind-wb-btn');
const ytSettingsSheet = document.getElementById('yt-settings-sheet');
const ytSummaryListBtn = document.getElementById('yt-summary-list-btn');
const ytClearDataBtn = document.getElementById('yt-clear-data-btn');
const ytBoundWbName = document.getElementById('yt-bound-wb-name');

function closeYtSettingsSheet() {
    if (ytSettingsSheet) ytSettingsSheet.classList.remove('active');
}

function refreshYoutubeUiAfterReset() {
    if (typeof window.ensureYtUserState === 'function') {
        ytUserState = window.ensureYtUserState();
    }

    if (typeof syncYtProfile === 'function') syncYtProfile();
    if (typeof renderSubscriptions === 'function') renderSubscriptions();
    if (typeof renderVideos === 'function') renderVideos();
    if (typeof renderMessagesList === 'function') renderMessagesList();

    if (typeof window.openView === 'function') {
        const playerView = document.getElementById('yt-video-player-view');
        const userLiveView = document.getElementById('yt-user-live-view');
        const subChannelViewEl = document.getElementById('sub-channel-view');
        const bubbleChatView = document.getElementById('yt-bubble-chat-view');
        const communityDetailView = document.getElementById('yt-community-detail-view');

        [playerView, userLiveView, subChannelViewEl, bubbleChatView, communityDetailView].forEach(view => {
            if (view && view.classList.contains('active')) {
                view.classList.remove('active');
            }
        });
    }
}

function updateYtBoundWorldBookLabel() {
    if (!ytBoundWbName) return;

    const ids = Array.isArray(channelState?.boundWorldBookIds) ? channelState.boundWorldBookIds : [];
    if (ids.length === 0) {
        ytBoundWbName.textContent = '未绑定';
        return;
    }

    const books = typeof window.getWorldBooks === 'function' ? window.getWorldBooks() : [];
    const names = ids
        .map(id => books.find(book => String(book.id) === String(id))?.name)
        .filter(Boolean);

    ytBoundWbName.textContent = names.length > 0 ? names.join('、') : `已绑定 ${ids.length} 项`;
}

if (ytBindWorldBookBtn && ytSettingsSheet) {
    ytBindWorldBookBtn.addEventListener('click', () => {
        if (window.renderWorldBookSelector) {
            window.renderWorldBookSelector(
                channelState.boundWorldBookIds || [],
                (selectedIds) => {
                    channelState.boundWorldBookIds = selectedIds;
                    if (typeof saveYoutubeData === 'function') saveYoutubeData();
                    updateYtBoundWorldBookLabel();
                }
            );
        }
    });
}

if (ytSummaryListBtn) {
    ytSummaryListBtn.addEventListener('click', () => {
        if (typeof window.renderYtSummaryList === 'function') {
            window.renderYtSummaryList();
        }
        const summarySheet = document.getElementById('yt-summary-list-sheet');
        if (summarySheet) summarySheet.classList.add('active');
        closeYtSettingsSheet();
    });
}

if (ytClearDataBtn) {
    ytClearDataBtn.addEventListener('click', () => {
        const runReset = () => {
            if (typeof window.resetYoutubeData === 'function') {
                window.resetYoutubeData({ preserveDefaultProfile: true, saveImmediately: false });
            } else {
                channelState = typeof createDefaultYtChannelState === 'function' ? createDefaultYtChannelState() : {};
                mockSubscriptions = [];
                hasSubscriptions = false;
                mockVideos = [];
                currentChatHistory = [];
                currentSummaryFilter = '全部';
                ytUserState = typeof window.createYtUserStateFromAppleId === 'function'
                    ? window.createYtUserStateFromAppleId()
                    : null;
                if (typeof saveYoutubeData === 'function') {
                    saveYoutubeData({ skipUserState: !ytUserState });
                } else if (typeof window.saveGlobalData === 'function') {
                    window.saveGlobalData();
                }
            }

            refreshYoutubeUiAfterReset();
            closeYtSettingsSheet();

            if (window.showToast) {
                window.showToast('YouTube 数据已清理');
            }
        };

        if (window.showCustomModal) {
            window.showCustomModal({
                title: '清理 YouTube 数据',
                message: '将清除 YouTube 的频道资料、订阅列表、消息与缓存，不影响全局 Apple ID 和其他 App 数据',
                confirmText: '确认清理',
                cancelText: '取消',
                isDestructive: true,
                onConfirm: runReset
            });
        } else {
            const confirmed = window.confirm('将清除 YouTube 的频道资料、订阅列表、消息与缓存，不影响全局 Apple ID 和其他 App 数据。确认继续？');
            if (confirmed) runReset();
        }
    });
}

updateYtBoundWorldBookLabel();
