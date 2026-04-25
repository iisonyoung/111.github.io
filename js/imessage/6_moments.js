// ==========================================
// IMESSAGE: 6. MOMENTS (朋友圈)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    const { apiConfig, openView, closeView, showToast } = window;

    const momentsContent = document.getElementById('moments-content');
    const navMomentsBtn = document.getElementById('nav-moments-btn');
    const imBottomNavContainer = document.querySelector('.line-bottom-nav-container');
    const momentsScrollContainer = document.getElementById('moments-scroll-container');

    if (window.imApp && window.imApp.ensureDataReady) {
        await window.imApp.ensureDataReady();
    }

    async function ensureMomentsModuleDataReady() {
        if (window.imApp?.ensureMomentsReady) {
            await window.imApp.ensureMomentsReady();
        }
    }

    async function ensureMomentMessagesModuleDataReady() {
        if (window.imApp?.ensureMomentMessagesReady) {
            await window.imApp.ensureMomentMessagesReady();
        }
    }

    // --- Moments Main Logic ---
    function getMomentMessages() {
        if (window.imApp.getMomentMessages) {
            return window.imApp.getMomentMessages();
        }
        return Array.isArray(window.imData.momentMessages) ? window.imData.momentMessages : [];
    }

    function cloneSnapshot(value) {
        if (typeof structuredClone === 'function') {
            return structuredClone(value);
        }
        return JSON.parse(JSON.stringify(value));
    }

    async function commitMomentsChange(momentId, mutator, options = {}) {
        if (!window.imApp.commitMomentChange) {
            const previousMoments = cloneSnapshot(window.imData.moments);
            if (typeof mutator === 'function') mutator();
            const saved = window.imApp.saveMoments
                ? await window.imApp.saveMoments({ silent: options.silent !== false })
                : false;
            if (!saved) {
                window.imData.moments = previousMoments;
                refreshAllMomentsViews();
                return false;
            }
            return true;
        }

        return window.imApp.commitMomentChange(momentId, mutator, {
            silent: options.silent !== false,
            immediate: options.immediate,
            delay: options.delay,
            onRollback: () => {
                refreshAllMomentsViews();
            }
        });
    }

    async function commitFriendsChange(friendOrId, mutator, options = {}) {
        if (window.imApp.commitFriendChange) {
            const targetId = typeof friendOrId === 'object' && friendOrId !== null ? friendOrId.id : friendOrId;
            return window.imApp.commitFriendChange(targetId, mutator, {
                silent: options.silent !== false,
                immediate: options.immediate,
                delay: options.delay,
                metaOnly: options.metaOnly,
                includeMessages: options.includeMessages
            });
        }

        if (!window.imApp.commitFriendsChange) {
            return false;
        }

        return window.imApp.commitFriendsChange(mutator, {
            silent: options.silent !== false,
            friendId: typeof friendOrId === 'object' && friendOrId !== null ? friendOrId.id : friendOrId,
            metaOnly: options.metaOnly,
            includeMessages: options.includeMessages
        });
    }

    function findMomentById(momentId) {
        return window.imData.moments.find((m) => m && m.id === momentId) || null;
    }

    function refreshViewsForMomentUser(moment) {
        renderMoments();
        if (userMomentsView && userMomentsView.classList.contains('active') && moment) {
            const viewingUserId = currentOpenUserId === 'me' ? 'me' : currentOpenUserId;
            if (viewingUserId === moment.userId || (viewingUserId === 'me' && moment.userId === 'me')) {
                openUserMoments(viewingUserId);
            }
        }
    }

    if (navMomentsBtn) {
        navMomentsBtn.addEventListener('click', async () => {
            await ensureMomentsModuleDataReady();

            if (window.imApp.hideAllTabs) window.imApp.hideAllTabs();
            if (momentsContent) {
                momentsContent.style.display = 'flex';
                momentsContent.style.flexDirection = 'column';
                renderMoments();

                if (imBottomNavContainer) imBottomNavContainer.style.display = 'flex';

                const imHeaderRight = document.querySelector('.line-header-right');
                if (imHeaderRight) imHeaderRight.style.display = 'none';
            }
            navMomentsBtn.classList.add('active');
            if (window.imApp.updateLineNavIndicator) window.imApp.updateLineNavIndicator(navMomentsBtn);
        });
    }

    // Cover Upload
    const momentsCoverWrapper = document.getElementById('moments-cover-wrapper');
    const momentsCoverUpload = document.getElementById('moments-cover-upload');
    const momentsCoverImg = document.getElementById('moments-cover-img');

    const savedMomentsCover = window.imApp.getMomentsCoverUrl
        ? window.imApp.getMomentsCoverUrl()
        : null;
    if (savedMomentsCover && momentsCoverImg) {
        momentsCoverImg.src = savedMomentsCover;
        momentsCoverImg.style.display = 'block';
    }

    if (momentsCoverWrapper && momentsCoverUpload) {
        momentsCoverWrapper.addEventListener('click', (e) => {
            if (e.target !== momentsCoverUpload) momentsCoverUpload.click();
        });

        momentsCoverUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const nextCoverSource = window.imApp.compressImageFile
                    ? await window.imApp.compressImageFile(file, {
                        maxWidth: 1280,
                        maxHeight: 1280,
                        mimeType: 'image/jpeg',
                        quality: 0.82
                    })
                    : await window.imApp.readFileAsDataUrl(file);

                const coverUrl = window.imApp.saveMomentsCover
                    ? await window.imApp.saveMomentsCover(nextCoverSource)
                    : nextCoverSource;
                if (!coverUrl) return;
                if (momentsCoverImg) {
                    momentsCoverImg.src = coverUrl;
                    momentsCoverImg.style.display = 'block';
                }
            } catch (error) {
                console.error('Failed to process moments cover', error);
                if (showToast) showToast('封面处理失败');
            }
        });
    }

    // Avatar update in moments
    const momentsUserName = document.getElementById('moments-user-name');
    const momentsUserAvatarWrapper = document.getElementById('moments-user-avatar-wrapper');
    const momentsUserAvatarImg = document.getElementById('moments-user-avatar-img');
    const momentsUserAvatarIcon = document.getElementById('moments-user-avatar-icon');
    const mainMomentsSignature = document.getElementById('main-moments-signature');

    function syncMomentsUser() {
        if (momentsUserName) momentsUserName.textContent = window.userState ? window.userState.name : 'User';
        if (mainMomentsSignature) {
            const sig = window.userState ? window.userState.signature : '';
            if (sig) {
                mainMomentsSignature.textContent = sig;
                mainMomentsSignature.style.display = 'block';
            } else {
                mainMomentsSignature.style.display = 'none';
            }
        }
        if (momentsUserAvatarImg && momentsUserAvatarIcon) {
            const avatarUrl = window.userState ? window.userState.avatarUrl : null;
            if (avatarUrl) {
                momentsUserAvatarImg.src = avatarUrl;
                momentsUserAvatarImg.style.display = 'block';
                momentsUserAvatarIcon.style.display = 'none';
            } else {
                momentsUserAvatarImg.style.display = 'none';
                momentsUserAvatarIcon.style.display = 'flex';
            }
        }
    }

    setTimeout(syncMomentsUser, 0);

    document.addEventListener('imessage-data-ready', syncMomentsUser);
    window.addEventListener('user-state-updated', syncMomentsUser);

    if (momentsUserAvatarWrapper) {
        momentsUserAvatarWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            openUserMoments('me');
        });
    }

    // --- Moment Detail & Action Logic ---
    let currentDetailMoment = null;
    const momentDetailOverlay = document.getElementById('moment-detail-overlay');
    const momentActionSheet = document.getElementById('moment-action-sheet');
    const momentActionCancel = document.getElementById('moment-action-cancel');
    const momentDetailMoreBtn = document.getElementById('moment-detail-more-btn');

    const mActionEdit = document.getElementById('moment-action-edit');
    const mActionPrivacy = document.getElementById('moment-action-privacy');
    const mActionPin = document.getElementById('moment-action-pin');
    const mActionDelete = document.getElementById('moment-action-delete');

    function openMomentDetail(m) {
        if (!momentDetailOverlay) return;
        currentDetailMoment = m;

        const timeEl = document.getElementById('moment-detail-time');
        const textEl = document.getElementById('moment-detail-text');
        const avatarEl = document.getElementById('moment-detail-avatar');
        const nameEl = document.getElementById('moment-detail-name');
        const pinnedTag = document.getElementById('moment-detail-pinned-tag');
        const pinActionText = document.getElementById('moment-action-pin-text');

        if (pinnedTag) pinnedTag.style.display = m.isPinned ? 'inline-block' : 'none';
        if (pinActionText) pinActionText.textContent = m.isPinned ? '取消置顶' : '置顶';

        if (avatarEl) {
            if (m.avatar) {
                avatarEl.innerHTML = `<img src="${m.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                avatarEl.innerHTML = `<i class="fas fa-user"></i>`;
            }
        }

        if (nameEl) nameEl.textContent = m.name || '';

        const imagesEl = document.getElementById('moment-detail-images');
        const interactionEl = document.getElementById('moment-detail-interaction');
        const likesListEl = document.getElementById('moment-detail-likes-list');
        const likesContainerEl = document.getElementById('moment-detail-likes');
        const commentsListEl = document.getElementById('moment-detail-comments-list');

        if (timeEl) {
            const d = new Date(m.time);
            timeEl.textContent = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }

        if (textEl) {
            textEl.textContent = m.text || '';
            textEl.style.display = m.text ? 'block' : 'none';
        }

        if (imagesEl) {
            imagesEl.innerHTML = '';
            imagesEl.className = 'moment-detail-images';
            if (m.images && m.images.length > 0) {
                if (m.images.length === 1) imagesEl.classList.add('single');
                else if (m.images.length === 2 || m.images.length === 4) imagesEl.classList.add('double');
                else imagesEl.classList.add('grid');

                m.images.forEach((img) => {
                    const src = typeof img === 'object' ? img.src : img;
                    imagesEl.innerHTML += `<div class="moment-detail-img-wrapper" style="width:100%; height:100%; overflow:hidden;"><img src="${src}" style="width:100%; height:100%; object-fit:cover;"></div>`;
                });
                imagesEl.style.display = 'grid';
            } else {
                imagesEl.style.display = 'none';
            }
        }

        const hasLikes = m.likes && m.likes.length > 0;
        const hasComments = m.comments && m.comments.length > 0;

        if (interactionEl) {
            if (!hasLikes && !hasComments) {
                interactionEl.style.display = 'none';
            } else {
                interactionEl.style.display = 'block';

                if (likesContainerEl) {
                    if (hasLikes) {
                        likesListEl.textContent = m.likes.join(', ');
                        likesContainerEl.style.display = 'flex';
                    } else {
                        likesContainerEl.style.display = 'none';
                    }
                }

                if (commentsListEl) {
                    commentsListEl.innerHTML = '';
                    if (hasComments) {
                        m.comments.forEach((c) => {
                            commentsListEl.innerHTML += `<div class="moment-detail-comment" style="font-size: 15px; margin-bottom: 4px; line-height: 1.4;"><span class="moment-detail-comment-name">${c.name}: </span>${c.content}</div>`;
                        });
                        if (hasLikes) {
                            commentsListEl.style.borderTop = '1px solid #e5e5ea';
                            commentsListEl.style.paddingTop = '12px';
                            commentsListEl.style.marginTop = '10px';
                        } else {
                            commentsListEl.style.borderTop = 'none';
                            commentsListEl.style.paddingTop = '0';
                        }
                    }
                }
            }
        }

        momentDetailOverlay.style.display = 'flex';
        void momentDetailOverlay.offsetWidth;
        momentDetailOverlay.classList.add('active');
    }

    function populateMomentShareSheet() {
        const friendsListEl = document.getElementById('moment-share-friends-list');
        if (!friendsListEl) return;

        friendsListEl.innerHTML = '';

        if (window.imData.friends && window.imData.friends.length > 0) {
            window.imData.friends.forEach((friend) => {
                const item = document.createElement('div');
                item.className = 'moment-share-friend-item';

                const avatarHtml = friend.avatarUrl
                    ? `<img src="${friend.avatarUrl}">`
                    : `<i class="fas fa-user"></i>`;

                item.innerHTML = `
                    <div class="moment-share-friend-avatar">${avatarHtml}</div>
                    <div class="moment-share-friend-name">${friend.nickname}</div>
                `;

                item.addEventListener('click', async () => {
                    if (currentDetailMoment) {
                        const contentObj = {
                            id: currentDetailMoment.id,
                            text: currentDetailMoment.text,
                            img: null,
                            imgDesc: null
                        };

                        if (currentDetailMoment.images && currentDetailMoment.images.length > 0) {
                            const firstImg = currentDetailMoment.images[0];
                            contentObj.img = typeof firstImg === 'object' ? firstImg.src : firstImg;
                            contentObj.imgDesc = typeof firstImg === 'object' ? firstImg.desc : null;
                        }

                        const content = JSON.stringify(contentObj);

                        const msgData = {
                            role: 'user',
                            type: 'moment_forward',
                            content: content,
                            timestamp: Date.now()
                        };

                        const saved = window.imApp.appendFriendMessage
                            ? await window.imApp.appendFriendMessage(friend.id, msgData, { silent: true })
                            : await commitFriendsChange(friend.id, (targetFriend) => {
                                if (!targetFriend.messages) targetFriend.messages = [];
                                targetFriend.messages.push(msgData);
                            });
                        if (!saved) return;

                        showToast(`已转发给 ${friend.nickname}`);
                        closeView(momentActionSheet);
                    }
                });

                friendsListEl.appendChild(item);
            });
        } else {
            friendsListEl.innerHTML = '<div style="font-size: 13px; color: #8e8e93; text-align: center; width: 100%;">暂无联系人</div>';
        }
    }

    function closeMomentDetail() {
        if (!momentDetailOverlay) return;
        momentDetailOverlay.classList.remove('active');
        setTimeout(() => {
            momentDetailOverlay.style.display = 'none';
            currentDetailMoment = null;
        }, 300);
    }

    if (momentDetailOverlay) {
        momentDetailOverlay.addEventListener('click', (e) => {
            if (e.target === momentDetailOverlay) {
                closeMomentDetail();
            }
        });
    }

    if (momentDetailMoreBtn) {
        momentDetailMoreBtn.addEventListener('click', () => {
            if (momentActionSheet) {
                populateMomentShareSheet();
                openView(momentActionSheet);
            }
        });
    }

    if (momentActionCancel) {
        momentActionCancel.addEventListener('click', () => {
            closeView(momentActionSheet);
        });
    }

    if (mActionEdit) mActionEdit.addEventListener('click', () => { showToast('功能未实现'); closeView(momentActionSheet); closeMomentDetail(); });
    if (mActionPrivacy) mActionPrivacy.addEventListener('click', () => { showToast('功能未实现'); closeView(momentActionSheet); closeMomentDetail(); });

    if (mActionPin) {
        mActionPin.addEventListener('click', async () => {
            if (currentDetailMoment) {
                const nextPinnedState = !currentDetailMoment.isPinned;
                const targetMomentId = currentDetailMoment.id;
                const saved = await commitMomentsChange(targetMomentId, () => {
                    const targetMoment = findMomentById(targetMomentId);
                    if (!targetMoment) return;
                    targetMoment.isPinned = nextPinnedState;
                });
                if (saved) {
                    const latestMoment = findMomentById(targetMomentId);
                    if (latestMoment) currentDetailMoment = latestMoment;
                    showToast(nextPinnedState ? '已置顶' : '已取消置顶');
                    refreshAllMomentsViews();
                }
            }
            closeView(momentActionSheet);
            closeMomentDetail();
        });
    }

    if (mActionDelete) {
        mActionDelete.addEventListener('click', () => {
            closeView(momentActionSheet);
            if (currentDetailMoment) {
                if (window.showCustomModal) {
                    window.showCustomModal({
                        title: '删除朋友圈',
                        message: '确定要删除这条朋友圈吗？',
                        isDestructive: true,
                        confirmText: '删除',
                        onConfirm: async () => {
                            const targetMomentId = currentDetailMoment.id;
                            const nextMoments = window.imData.moments.filter((m) => m.id !== targetMomentId);
                            const saved = await commitMomentsChange(targetMomentId, () => {
                                window.imData.moments = nextMoments;
                            });
                            if (!saved) return;

                            closeMomentDetail();
                            refreshAllMomentsViews();
                            showToast('已删除');
                        }
                    });
                }
            }
        });
    }

    if (momentsContent) {
        momentsContent.addEventListener('click', () => {
            document.querySelectorAll('.moment-action-menu.active').forEach((menu) => {
                menu.classList.remove('active');
            });
        });
    }

    // --- Publishing Moment ---
    const momentsCameraBtn = document.getElementById('moments-camera-btn');
    const publishMomentView = document.getElementById('publish-moment-view');
    const publishMomentCancel = document.getElementById('publish-moment-cancel');
    const publishMomentSubmit = document.getElementById('publish-moment-submit');
    const publishMomentText = document.getElementById('publish-moment-text');
    const publishMomentAddImg = document.getElementById('publish-moment-add-img');
    const publishMomentUpload = document.getElementById('publish-moment-upload');
    const publishMomentImages = document.getElementById('publish-moment-images');

    const publishMomentDescModal = document.getElementById('publish-moment-desc-modal');
    const publishMomentImgDesc = document.getElementById('publish-moment-img-desc');
    const publishMomentDescConfirm = document.getElementById('publish-moment-desc-confirm');

    let pendingImages = [];
    let isPublishing = false;
    let currentEditImageIndex = -1;

    if (momentsCameraBtn) {
        momentsCameraBtn.addEventListener('click', () => {
            pendingImages = [];
            if (publishMomentText) publishMomentText.value = '';
            isPublishing = false;
            renderPendingImages();
            checkPublishState();

            if (publishMomentView) {
                publishMomentView.style.display = 'flex';
                void publishMomentView.offsetWidth;
                publishMomentView.classList.add('active');
            }
        });
    }

    if (publishMomentCancel) {
        publishMomentCancel.addEventListener('click', () => {
            publishMomentView.classList.remove('active');
            setTimeout(() => publishMomentView.style.display = 'none', 300);
        });
    }

    if (publishMomentAddImg && publishMomentUpload) {
        publishMomentAddImg.addEventListener('click', () => {
            publishMomentUpload.click();
        });

        publishMomentUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) {
                e.target.value = '';
                return;
            }

            try {
                const processedImages = await Promise.all(
                    files.map(async (file) => {
                        const src = window.imApp.compressImageFile
                            ? await window.imApp.compressImageFile(file, {
                                maxWidth: 1080,
                                maxHeight: 1080,
                                mimeType: 'image/jpeg',
                                quality: 0.8
                            })
                            : await window.imApp.readFileAsDataUrl(file);

                        return { src, desc: '' };
                    })
                );

                pendingImages.push(...processedImages.filter((item) => item && item.src));
                renderPendingImages();
                checkPublishState();
            } catch (error) {
                console.error('Failed to process moment images', error);
                if (showToast) showToast('图片处理失败');
            }

            e.target.value = '';
        });
    }

    function renderPendingImages() {
        if (!publishMomentImages) return;
        const currentImgs = publishMomentImages.querySelectorAll('.pending-img-wrapper');
        currentImgs.forEach((el) => el.remove());

        pendingImages.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'pending-img-wrapper';
            div.style.position = 'relative';
            div.style.aspectRatio = '1/1';

            div.innerHTML = `
                <img src="${item.src}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;">
                <div class="remove-img-btn" data-index="${index}" style="position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.5); color: #fff; width: 20px; height: 20px; display: flex; justify-content: center; align-items: center; cursor: pointer;">
                    <i class="fas fa-times" style="font-size: 12px;"></i>
                </div>
                ${item.desc ? '<div style="position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.5); color: #fff; font-size: 10px; padding: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;">已添加描述</div>' : ''}
            `;

            if (publishMomentAddImg) publishMomentImages.insertBefore(div, publishMomentAddImg);
            else publishMomentImages.appendChild(div);

            div.querySelector('img').addEventListener('click', () => {
                currentEditImageIndex = index;
                if (publishMomentImgDesc) publishMomentImgDesc.value = item.desc || '';
                if (publishMomentDescModal) {
                    publishMomentDescModal.style.display = 'flex';
                    void publishMomentDescModal.offsetWidth;
                    publishMomentDescModal.classList.add('active');
                }
            });

            div.querySelector('.remove-img-btn').addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                pendingImages.splice(idx, 1);
                renderPendingImages();
                checkPublishState();
            });
        });
    }

    if (publishMomentDescConfirm) {
        publishMomentDescConfirm.addEventListener('click', () => {
            if (currentEditImageIndex >= 0 && currentEditImageIndex < pendingImages.length) {
                pendingImages[currentEditImageIndex].desc = publishMomentImgDesc ? publishMomentImgDesc.value.trim() : '';
                renderPendingImages();
            }
            if (publishMomentDescModal) {
                publishMomentDescModal.classList.remove('active');
                setTimeout(() => {
                    publishMomentDescModal.style.display = 'none';
                }, 300);
            }
        });
    }

    if (publishMomentDescModal) {
        publishMomentDescModal.addEventListener('click', (e) => {
            if (e.target === publishMomentDescModal) {
                publishMomentDescModal.classList.remove('active');
                setTimeout(() => {
                    publishMomentDescModal.style.display = 'none';
                }, 300);
            }
        });
    }

    if (publishMomentText) {
        publishMomentText.addEventListener('input', checkPublishState);
    }

    function checkPublishState() {
        if (!publishMomentText || !publishMomentSubmit) return;
        const hasText = publishMomentText.value.trim().length > 0;
        const hasImages = pendingImages.length > 0;

        if (hasText || hasImages) {
            publishMomentSubmit.classList.add('active');
            publishMomentSubmit.style.color = '#fff';
            publishMomentSubmit.style.backgroundColor = '#000';
        } else {
            publishMomentSubmit.classList.remove('active');
            publishMomentSubmit.style.color = '#b2b2b2';
            publishMomentSubmit.style.backgroundColor = '#f2f2f2';
        }
    }

    if (publishMomentSubmit) {
        publishMomentSubmit.addEventListener('click', async () => {
            const text = publishMomentText ? publishMomentText.value.trim() : '';
            const hasImages = pendingImages.length > 0;

            if (!text && !hasImages) {
                showToast('内容不能为空');
                return;
            }

            if (isPublishing) return;
            isPublishing = true;
            publishMomentSubmit.classList.remove('active');

            const imgs = cloneSnapshot(pendingImages);

            const newMoment = {
                id: Date.now(),
                userId: 'me',
                name: window.userState ? window.userState.name : 'Me',
                avatar: window.userState ? window.userState.avatarUrl : null,
                text: text,
                images: imgs,
                time: Date.now(),
                likes: [],
                comments: [],
                isPinned: false
            };

            const saved = await commitMomentsChange(newMoment.id, () => {
                window.imData.moments.unshift(newMoment);
            });

            if (!saved) {
                isPublishing = false;
                checkPublishState();
                return;
            }

            renderMoments();

            if (momentsScrollContainer) momentsScrollContainer.scrollTop = 0;

            if (publishMomentView) {
                publishMomentView.classList.remove('active');
                publishMomentView.style.display = 'none';
            }
            isPublishing = false;
            pendingImages = [];
            if (publishMomentText) publishMomentText.value = '';

            if (userMomentsView && userMomentsView.style.display !== 'none') {
                openUserMoments('me');
            }

            showToast('发表成功');
            await triggerAutoCommentsForMyMoment(newMoment.id);
        });
    }

    // --- Unified Refresh Function (Task 5: Real-time updates) ---
    function refreshAllMomentsViews() {
        // Re-render main moments feed
        renderMoments();

        // Re-render user moments view if it's open
        if (userMomentsView && userMomentsView.classList.contains('active')) {
            renderUserMomentsList(currentOpenUserId);
        }
    }

    // --- Rendering Feed Elements ---
    function createMomentElement(m) {
        const item = document.createElement('div');
        item.className = 'moment-item';

        const momentId = m.id;

        let avatarHtml = m.avatar
            ? `<img src="${m.avatar}">`
            : `<i class="fas fa-user"></i>`;

        let imagesHtml = '';
        if (m.images && m.images.length > 0) {
            let layoutClass = 'grid';
            if (m.images.length === 1) layoutClass = 'single';
            if (m.images.length === 2 || m.images.length === 4) layoutClass = 'double';

            const imgDivs = m.images.map((img) => {
                const src = typeof img === 'object' ? img.src : img;
                return `<div class="moment-img-wrapper"><img src="${src}" style="width:100%; height:100%; object-fit:cover;"></div>`;
            }).join('');
            imagesHtml = `<div class="moment-images ${layoutClass}">${imgDivs}</div>`;
        }

        let interactionHtml = '';
        const hasLikes = m.likes && m.likes.length > 0;
        const hasComments = m.comments && m.comments.length > 0;

        if (hasLikes || hasComments) {
            let likesHtml = '';
            if (hasLikes) {
                likesHtml = `<div class="moment-likes"><i class="far fa-heart" style="margin-top:2px;"></i> <span class="moment-likes-list">${m.likes.join(', ')}</span></div>`;
            }

            let commentsHtml = '';
            if (hasComments) {
                commentsHtml = m.comments.map((c) => `<div class="moment-comment"><span class="moment-comment-name">${c.name}: </span>${c.content}</div>`).join('');
            }

            interactionHtml = `
                <div class="moment-interaction-area">
                    ${likesHtml}
                    ${hasLikes && hasComments ? '<div style="border-bottom: 1px solid #e5e5ea; margin: 4px 0;"></div>' : ''}
                    ${commentsHtml}
                </div>
            `;
        }

        const currentMyName = window.userState ? window.userState.name : 'Me';
        const hasLiked = m.likes && m.likes.includes(currentMyName);
        const likeText = hasLiked ? '取消' : '赞';

        const timeStr = window.imApp.formatTime ? window.imApp.formatTime(m.time) : '';

        item.innerHTML = `
            <div class="moment-avatar" style="cursor: pointer;">${avatarHtml}</div>
            <div class="moment-main">
                <div class="moment-name">${m.name}</div>
                <div class="moment-text">${m.text}</div>
                ${imagesHtml}
                <div class="moment-footer">
                    <span class="moment-time">${timeStr}</span>
                    <div class="moment-action-btn"><i class="fas fa-ellipsis-h" style="transform: scale(0.8)"></i></div>
                    <div class="moment-action-menu">
                        <div class="moment-action-item like-btn"><i class="far fa-heart"></i> ${likeText}</div>
                        <div class="moment-action-item comment-btn"><i class="far fa-comment"></i> 评论</div>
                        <div class="moment-action-item forward-btn"><i class="fas fa-share"></i> 转发</div>
                        <div class="moment-action-item delete-btn" style="color: #ff3b30;"><i class="fas fa-trash"></i> 删除</div>
                    </div>
                </div>
                ${interactionHtml}
            </div>
        `;

        item.addEventListener('click', (e) => {
            // Prevent clicking the moment item from opening chat if we clicked a button
            if (e.target.closest('.moment-action-btn') || e.target.closest('.moment-action-menu')) return;
        });

        const avatarEl = item.querySelector('.moment-avatar');
        avatarEl.addEventListener('click', (e) => {
            e.stopPropagation();
            openUserMoments(m.userId);
        });

        const actionBtn = item.querySelector('.moment-action-btn');
        const actionMenu = item.querySelector('.moment-action-menu');

        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.moment-action-menu.active').forEach((menu) => {
                if (menu !== actionMenu) menu.classList.remove('active');
            });
            actionMenu.classList.toggle('active');
        });

        item.querySelector('.like-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            actionMenu.classList.remove('active');

            const saved = await commitMomentsChange(momentId, (moment) => {
                if (!moment) return;
                if (!moment.likes) moment.likes = [];
                const idx = moment.likes.indexOf(currentMyName);
                if (idx > -1) moment.likes.splice(idx, 1);
                else moment.likes.push(currentMyName);
            });

            if (!saved) return;

            const latestMoment = findMomentById(momentId);
            refreshViewsForMomentUser(latestMoment);
        });

        item.querySelector('.forward-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            actionMenu.classList.remove('active');
            const latestMoment = findMomentById(momentId) || m;
            openMomentForwardSheet(latestMoment);
        });

        item.querySelector('.comment-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            actionMenu.classList.remove('active');
            if (window.showCustomModal) {
                window.showCustomModal({
                    type: 'prompt',
                    title: '评论',
                    placeholder: '评论...',
                    confirmText: '发送',
                    onConfirm: async (text) => {
                        if (!text || !text.trim()) return;

                        const newComment = {
                            name: window.userState ? window.userState.name : 'Me',
                            content: text.trim()
                        };

                        const saved = await commitMomentsChange(momentId, () => {
                            const moment = findMomentById(momentId);
                            if (!moment) return;
                            if (!moment.comments) moment.comments = [];
                            moment.comments.push(newComment);
                        });

                        if (!saved) return;

                        const latestMoment = findMomentById(momentId);
                        refreshViewsForMomentUser(latestMoment);
                    }
                });
            }
        });

        item.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            actionMenu.classList.remove('active');
            if (window.showCustomModal) {
                window.showCustomModal({
                    title: '删除朋友圈',
                    message: '确定要删除这条朋友圈吗？',
                    isDestructive: true,
                    confirmText: '删除',
                    onConfirm: async () => {
                        const targetMomentId = momentId;
                        const nextMoments = window.imData.moments.filter((m) => m.id !== targetMomentId);
                        const saved = await commitMomentsChange(targetMomentId, () => {
                            window.imData.moments = nextMoments;
                        });
                        if (!saved) return;

                        refreshAllMomentsViews();
                        if (window.showToast) window.showToast('已删除');
                    }
                });
            }
        });

        return item;
    }

    function renderMoments() {
        const list = document.getElementById('moments-list');
        if (!list) return;
        list.innerHTML = '';

        window.imData.moments.forEach((m) => {
            const item = createMomentElement(m);
            list.appendChild(item);
        });
    }

    function openMomentForwardSheet(m) {
        const sheet = document.getElementById('moment-forward-sheet');
        const list = document.getElementById('moment-forward-list');
        if (!sheet || !list) return;

        list.innerHTML = '';
        if (window.imData.friends && window.imData.friends.length > 0) {
            window.imData.friends.forEach((friend) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.style.alignItems = 'center';
                item.style.gap = '5px';
                item.style.cursor = 'pointer';
                item.style.minWidth = '60px';

                const avatarHtml = friend.avatarUrl
                    ? `<img src="${friend.avatarUrl}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">`
                    : (friend.type === 'npc'
                        ? `<div style="width: 50px; height: 50px; border-radius: 8px; background: #e5e5ea; display: flex; justify-content: center; align-items: center; color: #8e8e93; font-size: 24px;"><i class="fas fa-robot"></i></div>`
                        : `<div style="width: 50px; height: 50px; border-radius: 8px; background: #e5e5ea; display: flex; justify-content: center; align-items: center; color: #8e8e93; font-size: 24px;"><i class="fas fa-user"></i></div>`);

                item.innerHTML = `
                    <div class="moment-share-friend-avatar" style="width: auto; height: auto; border-radius: 0; margin: 0;">${avatarHtml}</div>
                    <div class="moment-share-friend-name" style="font-size: 11px; color: #000; text-align: center; width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${friend.nickname}</div>
                `;

                item.addEventListener('click', async () => {
                    const contentObj = {
                        id: m.id,
                        text: m.text,
                        img: null,
                        imgDesc: null
                    };

                    if (m.images && m.images.length > 0) {
                        const firstImg = m.images[0];
                        contentObj.img = typeof firstImg === 'object' ? firstImg.src : firstImg;
                        contentObj.imgDesc = typeof firstImg === 'object' ? firstImg.desc : null;
                    }

                    const content = JSON.stringify(contentObj);

                    const msgData = {
                        role: 'user',
                        type: 'moment_forward',
                        content: content,
                        timestamp: Date.now()
                    };

                    const saved = window.imApp.appendFriendMessage
                        ? await window.imApp.appendFriendMessage(friend.id, msgData, { silent: true })
                        : await commitFriendsChange(friend.id, (targetFriend) => {
                            if (!targetFriend.messages) targetFriend.messages = [];
                            targetFriend.messages.push(msgData);
                        });
                    if (!saved) return;

                    const pageId = `chat-interface-${friend.id}`;
                    const page = document.getElementById(pageId);
                    if (page && page.style.display !== 'none') {
                        const msgContainer = page.querySelector('.ins-chat-messages');
                        if (window.imApp.renderMomentForwardBubble) window.imApp.renderMomentForwardBubble(msgData, friend, msgContainer, msgData.timestamp);
                    }

                    showToast(`已转发给 ${friend.nickname}`);
                    closeView(sheet);
                });

                list.appendChild(item);
            });
        } else {
            list.innerHTML = '<div style="font-size: 13px; color: #8e8e93; text-align: center; width: 100%; padding: 20px;">暂无联系人</div>';
        }

        openView(sheet);
    }

    const forwardSheetEl = document.getElementById('moment-forward-sheet');
    if (forwardSheetEl) {
        forwardSheetEl.addEventListener('click', (e) => {
            if (e.target === forwardSheetEl) closeView(forwardSheetEl);
        });
    }

    const forwardSheetCancel = document.getElementById('moment-forward-cancel');
    if (forwardSheetCancel) {
        forwardSheetCancel.addEventListener('click', () => {
            const sheet = document.getElementById('moment-forward-sheet');
            if (sheet) closeView(sheet);
        });
    }

    // --- User Moments (Personal Profile) ---
    const userMomentsView = document.getElementById('user-moments-view');
    const userMomentsBackBtn = document.getElementById('user-moments-back-btn');
    const userMomentsMoreBtn = document.getElementById('user-moments-more-btn');
    const momentsMessageView = document.getElementById('moments-message-view');
    const momentsMessageBack = document.getElementById('moments-message-back');
    let currentOpenUserId = 'me';

    if (userMomentsBackBtn) {
        userMomentsBackBtn.addEventListener('click', () => {
            if (userMomentsView) {
                userMomentsView.classList.remove('active');
                userMomentsView.classList.add('closing');
                setTimeout(() => {
                    userMomentsView.style.display = 'none';
                    userMomentsView.classList.remove('closing');
                }, 350);
            }
        });
    }

    if (userMomentsMoreBtn) {
        userMomentsMoreBtn.addEventListener('click', async () => {
            if (currentOpenUserId === 'me') {
                await ensureMomentMessagesModuleDataReady();

                if (momentsMessageView) {
                    renderMomentsMessages();
                    momentsMessageView.style.display = 'flex';
                    void momentsMessageView.offsetWidth;
                    momentsMessageView.classList.add('active');
                }
            } else {
                openCharMomentsSettings(currentOpenUserId);
            }
        });
    }

    if (momentsMessageBack) {
        momentsMessageBack.addEventListener('click', () => {
            if (momentsMessageView) {
                momentsMessageView.classList.remove('active');
                setTimeout(() => momentsMessageView.style.display = 'none', 300);
            }
        });
    }

    function renderMomentsMessages() {
        const list = document.getElementById('moments-message-list');
        if (!list) return;
        list.innerHTML = '';

        const currentMomentMessages = getMomentMessages();
        if (currentMomentMessages.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #999; padding-top: 50px; font-size: 14px;"><i class="fas fa-bell" style="font-size: 40px; color: #ccc; margin-bottom: 15px; display: block;"></i>暂无新消息</div>';
            return;
        }

        currentMomentMessages.forEach((msg) => {
            const item = document.createElement('div');
            item.className = 'moment-message-item';
            item.style.display = 'flex';
            item.style.padding = '12px 16px';
            item.style.borderBottom = '1px solid #f2f2f7';
            item.style.gap = '12px';

            const avatarHtml = msg.userAvatar
                ? `<img src="${msg.userAvatar}" style="width: 44px; height: 44px; border-radius: 4px; object-fit: cover;">`
                : `<div style="width: 44px; height: 44px; border-radius: 4px; background: #e5e5ea;"></div>`;

            let contentHtml = '';
            if (msg.type === 'like') {
                contentHtml = `<div style="font-size: 15px; color: #000; font-weight: 500;">${msg.userName} <i class="far fa-heart" style="color: #576b95; margin-left: 4px;"></i></div>`;
            } else {
                contentHtml = `
                    <div style="font-size: 15px; color: #576b95; font-weight: 600;">${msg.userName}</div>
                    <div style="font-size: 14px; color: #000; margin-top: 2px;">${msg.content}</div>
                `;
            }

            let momentPreview = '';
            if (msg.momentImg) {
                momentPreview = `<img src="${msg.momentImg}" style="width: 60px; height: 60px; object-fit: cover; background: #f2f2f7;">`;
            } else if (msg.momentText) {
                momentPreview = `<div style="width: 60px; height: 60px; background: #f2f2f7; color: #8e8e93; font-size: 10px; padding: 4px; overflow: hidden;">${msg.momentText}</div>`;
            }

            const timeStr = window.imApp.formatTime ? window.imApp.formatTime(msg.time) : '';

            item.innerHTML = `
                <div>${avatarHtml}</div>
                <div style="flex: 1;">
                    ${contentHtml}
                    <div style="font-size: 12px; color: #8e8e93; margin-top: 4px;">${timeStr}</div>
                </div>
                <div>${momentPreview}</div>
            `;

            list.appendChild(item);
        });
    }

    const charMomentsSettingsSheet = document.getElementById('char-moments-settings-sheet');

    function openCharMomentsSettings(userId) {
        if (!charMomentsSettingsSheet) {
            showToast('设置界面未加载');
            return;
        }

        const friend = window.imData.friends.find((f) => f.id == userId || f.id === userId);
        if (!friend) {
            showToast('未找到该角色的详细信息，无法打开设置');
            return;
        }

        const changeBgBtn = document.getElementById('char-moments-change-bg');
        const resetBgBtn = document.getElementById('char-moments-reset-bg');
        const aiPostBtn = document.getElementById('char-moments-ai-post');
        let bgUpload = document.getElementById('char-moments-bg-upload');
        if (!bgUpload) {
            bgUpload = document.createElement('input');
            bgUpload.type = 'file';
            bgUpload.id = 'char-moments-bg-upload';
            bgUpload.accept = 'image/*';
            bgUpload.style.display = 'none';
            document.body.appendChild(bgUpload);
        }

        const newChangeBg = changeBgBtn.cloneNode(true);
        changeBgBtn.parentNode.replaceChild(newChangeBg, changeBgBtn);

        const newResetBg = resetBgBtn.cloneNode(true);
        resetBgBtn.parentNode.replaceChild(newResetBg, resetBgBtn);

        const newAiPost = aiPostBtn.cloneNode(true);
        aiPostBtn.parentNode.replaceChild(newAiPost, aiPostBtn);

        newChangeBg.addEventListener('click', () => {
            bgUpload.click();
        });

        bgUpload.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) {
                e.target.value = '';
                return;
            }

            try {
                const nextCover = window.imApp.compressImageFile
                    ? await window.imApp.compressImageFile(file, {
                        maxWidth: 1280,
                        maxHeight: 1280,
                        mimeType: 'image/jpeg',
                        quality: 0.82
                    })
                    : await window.imApp.readFileAsDataUrl(file);

                const saved = await commitFriendsChange(friend.id, (targetFriend) => {
                    targetFriend.momentsCover = nextCover;
                }, { metaOnly: true, silent: true });
                if (!saved) return;

                if (userMomentsView && userMomentsView.classList.contains('active')) {
                    const coverImg = document.getElementById('user-moments-cover-img');
                    if (coverImg) {
                        coverImg.src = nextCover;
                        coverImg.style.display = 'block';
                    }
                }
                showToast('已更换背景');
            } catch (error) {
                console.error('Failed to process char moments cover', error);
                if (showToast) showToast('背景处理失败');
            }

            e.target.value = '';
        };

        newResetBg.addEventListener('click', async () => {
            const saved = await commitFriendsChange(friend.id, (targetFriend) => {
                targetFriend.momentsCover = null;
            }, { metaOnly: true, silent: true });
            if (!saved) return;

            if (userMomentsView && userMomentsView.classList.contains('active')) {
                const coverImg = document.getElementById('user-moments-cover-img');
                if (coverImg) coverImg.style.display = 'none';
            }
            showToast('已重置背景');
            closeView(charMomentsSettingsSheet);
        });

        newAiPost.addEventListener('click', () => {
            closeView(charMomentsSettingsSheet);
            triggerAiMomentPost(friend);
        });

        charMomentsSettingsSheet.onclick = (e) => {
            if (e.target === charMomentsSettingsSheet) {
                closeView(charMomentsSettingsSheet);
            }
        };

        openView(charMomentsSettingsSheet);
    }

    function getLastChatTimestampWithUser(friend) {
        if (!friend) return 0;

        const summaryTimestamp = Number(friend.lastMessageTimestamp) || 0;
        if (summaryTimestamp > 0) return summaryTimestamp;

        if (!Array.isArray(friend.messages) || friend.messages.length === 0) return 0;
        const validMessages = friend.messages.filter((msg) => msg && Number(msg.timestamp) > 0);
        if (validMessages.length === 0) return 0;
        return Math.max(...validMessages.map((msg) => Number(msg.timestamp) || 0));
    }

    function pickRandomItems(items, count) {
        const pool = Array.isArray(items) ? [...items] : [];
        const picked = [];
        while (pool.length > 0 && picked.length < count) {
            const index = Math.floor(Math.random() * pool.length);
            picked.push(pool.splice(index, 1)[0]);
        }
        return picked;
    }

    function getAutoCommentCandidates() {
        const allFriends = Array.isArray(window.imData.friends) ? window.imData.friends : [];
        const eligibleChars = allFriends.filter((friend) => {
            if (!friend) return false;
            if (friend.type === 'group' || friend.type === 'official') return false;
            return true;
        });

        if (eligibleChars.length === 0) return [];

        const twelveHoursMs = 12 * 60 * 60 * 1000;
        const now = Date.now();

        const recentChatChars = eligibleChars.filter((friend) => {
            const lastChatTime = getLastChatTimestampWithUser(friend);
            return lastChatTime > 0 && (now - lastChatTime) <= twelveHoursMs;
        });

        const sourcePool = recentChatChars.length > 0 ? recentChatChars : eligibleChars;
        const targetCount = Math.min(
            sourcePool.length,
            Math.max(1, Math.floor(Math.random() * 3) + 1)
        );

        return pickRandomItems(sourcePool, targetCount);
    }

    async function generateAutoCommentForMoment(moment, friend) {
        if (!moment || !friend || !apiConfig.endpoint || !apiConfig.apiKey) return null;

        const systemDepthWorldBookContext = window.getGlobalWorldBookContextByPosition
            ? window.getGlobalWorldBookContextByPosition('system_depth')
            : '';
        const beforeRoleWorldBookContext = window.getGlobalWorldBookContextByPosition
            ? window.getGlobalWorldBookContextByPosition('before_role')
            : '';
        const afterRoleWorldBookContext = window.getGlobalWorldBookContextByPosition
            ? window.getGlobalWorldBookContextByPosition('after_role')
            : '';

        const contextMessages = window.imApp.buildApiContextMessages
            ? window.imApp.buildApiContextMessages(friend, {
                userName: window.userState?.name || 'User'
            })
            : [];

        const lastChatTime = getLastChatTimestampWithUser(friend);
        const hasRecentChat = lastChatTime > 0 && (Date.now() - lastChatTime) <= 12 * 60 * 60 * 1000;
        const imageDescriptions = Array.isArray(moment.images)
            ? moment.images
                .map((img) => typeof img === 'object' ? (img.desc || '未命名图片') : '图片')
                .filter(Boolean)
                .join('；')
            : '';

        const systemPrompt = `${systemDepthWorldBookContext ? `System Depth Rules (Highest Priority):\n${systemDepthWorldBookContext}\n\n` : ''}${beforeRoleWorldBookContext ? `Before Role Rules:\n${beforeRoleWorldBookContext}\n\n` : ''}你正在扮演 ${friend.realName || friend.nickname}。
你的人设: ${friend.persona || '普通用户'}。
用户(${window.userState.name})的人设: ${window.userState.persona || '普通用户'}。${afterRoleWorldBookContext ? `\n\nAfter Role Rules:\n${afterRoleWorldBookContext}` : ''}

你现在要给 user 刚发的一条朋友圈写 1 条评论。
规则：
1. 只输出 1 条简短自然的评论，不要解释，不要加名字前缀，不要输出多条。
2. 如果你最近 12 小时内和 user 聊过天，可以更自然、更熟络地评论。
3. 如果你最近没有和 user 聊过天，语气要相对克制，有边界感一点，但仍然符合你的人设。
4. 评论必须像真的会发在朋友圈下面的话，简短、自然、有生活感。
5. 不要复述规则，不要输出思维链，不要输出 JSON。`;

        const userPromptParts = [
            `这是 user 刚发的朋友圈正文：\n${moment.text || '（无正文）'}`,
            imageDescriptions ? `这条朋友圈附带图片描述：\n${imageDescriptions}` : '',
            `你最近12小时内${hasRecentChat ? '和 user 聊过天' : '没有和 user 聊过天'}。`
        ].filter(Boolean);

        const messages = [{ role: 'system', content: systemPrompt }];
        if (Array.isArray(contextMessages) && contextMessages.length > 0) {
            messages.push(...contextMessages);
        }
        messages.push({ role: 'user', content: userPromptParts.join('\n\n') });

        let endpoint = apiConfig.endpoint;
        if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
        if (!endpoint.endsWith('/chat/completions')) {
            endpoint = endpoint.endsWith('/v1') ? endpoint + '/chat/completions' : endpoint + '/v1/chat/completions';
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiConfig.apiKey}` },
            body: JSON.stringify({
                model: apiConfig.model || '',
                messages,
                temperature: parseFloat(apiConfig.temperature) || 0.8
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        return data?.choices?.[0]?.message?.content?.trim() || null;
    }

    async function triggerAutoCommentsForMyMoment(momentId) {
        const baseMoment = findMomentById(momentId);
        if (!baseMoment || !apiConfig.endpoint || !apiConfig.apiKey) return;

        const candidates = getAutoCommentCandidates();
        if (!Array.isArray(candidates) || candidates.length === 0) return;

        const generatedComments = [];

        for (const friend of candidates) {
            try {
                const latestMoment = findMomentById(momentId);
                if (!latestMoment) break;

                const commentText = await generateAutoCommentForMoment(latestMoment, friend);
                if (!commentText) continue;

                generatedComments.push({
                    friend,
                    comment: {
                        name: friend.nickname || friend.realName || 'Friend',
                        content: commentText
                    },
                    content: commentText
                });
            } catch (e) {
                console.error('Auto moment comment failed:', e);
            }
        }

        if (generatedComments.length === 0) return;

        const saved = await commitMomentsChange(momentId, () => {
            const moment = findMomentById(momentId);
            if (!moment) return;
            if (!moment.comments) moment.comments = [];

            generatedComments.forEach((entry) => {
                moment.comments.push(entry.comment);
            });
        });

        if (!saved) return;

        if (window.imApp.addMomentNotification) {
            for (const entry of generatedComments) {
                await window.imApp.addMomentNotification('comment', entry.friend, momentId, entry.content);
            }
        }

        const latestMoment = findMomentById(momentId);
        refreshViewsForMomentUser(latestMoment);
    }

    async function triggerAiMomentPost(friend) {
        if (!apiConfig.endpoint || !apiConfig.apiKey) {
            showToast('请先配置 API');
            return;
        }
        showToast('正在编写朋友圈内容...');

        const systemDepthWorldBookContext = window.getGlobalWorldBookContextByPosition
            ? window.getGlobalWorldBookContextByPosition('system_depth')
            : '';
        const beforeRoleWorldBookContext = window.getGlobalWorldBookContextByPosition
            ? window.getGlobalWorldBookContextByPosition('before_role')
            : '';
        const afterRoleWorldBookContext = window.getGlobalWorldBookContextByPosition
            ? window.getGlobalWorldBookContextByPosition('after_role')
            : '';

        const availableFriends = (window.imData.friends || [])
            .filter(f => f.id !== friend.id && f.type !== 'group' && f.type !== 'official')
            .map(f => f.nickname || f.realName)
            .filter(Boolean);
        
        let friendsContext = '';
        if (availableFriends.length > 0) {
            friendsContext = `你的关系网包含以下角色: [${availableFriends.join(', ')}]。\n生成评论时，评论者的名字必须严格从这个列表中选择，不要自己捏造其他人名。`;
        }

        const systemPrompt = `${systemDepthWorldBookContext ? `System Depth Rules (Highest Priority):\n${systemDepthWorldBookContext}\n\n` : ''}${beforeRoleWorldBookContext ? `Before Role Rules:\n${beforeRoleWorldBookContext}\n\n` : ''}你正在扮演 ${friend.realName || friend.nickname}。
你的人设: ${friend.persona || '普通用户'}。
用户(${window.userState.name})的人设: ${window.userState.persona || '普通用户'}。
${friendsContext}
${afterRoleWorldBookContext ? `\n\nAfter Role Rules:\n${afterRoleWorldBookContext}` : ''}

请根据上下文发1-2条朋友圈，并附带生成1-2条该角色朋友圈底下的其他角色的评论。
格式要求：
1. 可以输出纯文字朋友圈，表达char当下的心情/见闻/感受等。
2. 可以根据上下文输出图片，如果是图片，请在文字后换行并单独占一行注明 [Image: 图片描述]，可给图片配文，符合图片描述内容。
3. 请为这条朋友圈生成 1-2 条其他角色的评论，格式为单独占一行 [Comment: 评论者名字: 评论内容]。比如：[Comment: 李四: 拍得真好！] (评论者必须来自上面的关系网列表)
4. 语气自然，简短，符合人设。
只要输出回复的话，禁止输出思维链（例如：<tool_call>...<tool_call> 或类似的内容），直接给出回复即可。`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '请发朋友圈，并生成1-2条关系网内其他人的评论。' }
        ];

        try {
            let endpoint = apiConfig.endpoint;
            if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
            if (!endpoint.endsWith('/chat/completions')) {
                endpoint = endpoint.endsWith('/v1') ? endpoint + '/chat/completions' : endpoint + '/v1/chat/completions';
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiConfig.apiKey}` },
                body: JSON.stringify({
                    model: apiConfig.model || '',
                    messages: messages,
                    temperature: parseFloat(apiConfig.temperature) || 0.8
                })
            });

            const data = await response.json();
            const reply = data.choices[0].message.content;

            const lines = reply.split('\n');
            let text = '';
            const images = [];
            const generatedComments = [];

            lines.forEach((line) => {
                const imgMatch = line.match(/\[Image:\s*(.*?)\]/i);
                const commentMatch = line.match(/\[Comment:\s*(.*?):\s*(.*?)\]/i);

                if (imgMatch) {
                    const desc = imgMatch[1];
                    const canvas = document.createElement('canvas');
                    canvas.width = 600;
                    canvas.height = 600;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#f2f2f7';
                    ctx.fillRect(0, 0, 600, 600);
                    ctx.fillStyle = '#000';
                    ctx.font = '24px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    ctx.fillText(desc.substring(0, 20) + (desc.length > 20 ? '...' : ''), 300, 300);

                    images.push({
                        src: canvas.toDataURL(),
                        desc: desc
                    });
                } else if (commentMatch) {
                    generatedComments.push({
                        name: commentMatch[1].trim(),
                        content: commentMatch[2].trim()
                    });
                } else {
                    if (line.trim()) text += line + '\n';
                }
            });

            const newMoment = {
                id: Date.now(),
                userId: friend.id,
                name: friend.nickname,
                avatar: friend.avatarUrl,
                text: text.trim(),
                images: images,
                time: Date.now(),
                likes: [],
                comments: generatedComments,
                isPinned: false
            };

            const saved = await commitMomentsChange(newMoment.id, () => {
                window.imData.moments.unshift(newMoment);
            });
            if (!saved) return;

            const list = document.getElementById('moments-list');
            if (list) {
                const itemEl = createMomentElement(newMoment);
                list.insertBefore(itemEl, list.firstChild);
            } else {
                renderMoments();
            }

            if (userMomentsView && userMomentsView.classList.contains('active') && currentOpenUserId == friend.id) {
                openUserMoments(friend.id);
            } else {
                if (momentsScrollContainer) momentsScrollContainer.scrollTop = 0;
            }

            showToast(`${friend.nickname} 发布了朋友圈`);
        } catch (e) {
            console.error(e);
            showToast('发布失败');
        }
    }

    async function openUserMoments(userId) {
        if (!userMomentsView) return;

        await ensureMomentsModuleDataReady();

        let targetName = 'User';
        let targetAvatar = null;
        let targetCover = null;
        let targetSignature = '';

        if (userId === 'me' || userId === 'self') {
            targetName = window.userState ? window.userState.name : 'Me';
            targetAvatar = window.userState ? window.userState.avatarUrl : null;
            targetSignature = window.userState ? window.userState.signature : '';
            targetCover = window.imApp.getMomentsCoverUrl
                ? window.imApp.getMomentsCoverUrl()
                : null;
            userId = 'me';
        } else {
            const friend = window.imData.friends.find((f) => f.id == userId || f.id === userId);
            if (friend) {
                targetName = friend.nickname;
                targetAvatar = friend.avatarUrl;
                targetSignature = friend.signature || '';
                targetCover = friend.momentsCover || null;
            } else {
                const dummy = window.imData.moments.find((m) => m.userId == userId);
                if (dummy) {
                    targetName = dummy.name;
                    targetAvatar = dummy.avatar;
                }
            }
        }

        currentOpenUserId = userId;

        const nameEl = document.getElementById('user-moments-name');
        const avatarImg = document.getElementById('user-moments-avatar-img');
        const avatarIcon = document.getElementById('user-moments-avatar-icon');
        const coverImg = document.getElementById('user-moments-cover-img');
        const signatureEl = document.getElementById('user-moments-signature');

        if (nameEl) nameEl.textContent = targetName;
        if (signatureEl) {
            if (targetSignature) {
                signatureEl.textContent = targetSignature;
                signatureEl.style.display = 'block';
            } else {
                signatureEl.style.display = 'none';
            }
        }
        if (avatarImg && avatarIcon) {
            if (targetAvatar) {
                avatarImg.src = targetAvatar;
                avatarImg.style.display = 'block';
                avatarIcon.style.display = 'none';
            } else {
                avatarImg.style.display = 'none';
                avatarIcon.style.display = 'flex';
            }
        }
        if (coverImg) {
            if (targetCover) {
                coverImg.src = targetCover;
                coverImg.style.display = 'block';
            } else {
                coverImg.style.display = 'none';
            }
        }

        renderUserMomentsList(userId);

        syncMomentsUser();
        userMomentsView.style.display = 'flex';
        if (userMomentsBackBtn) userMomentsBackBtn.style.display = 'block';
        if (userMomentsMoreBtn) userMomentsMoreBtn.style.display = 'block';
        void userMomentsView.offsetWidth;
        userMomentsView.classList.add('active');
    }

    function showPinnedPopup(moments) {
        let popup = document.getElementById('pinned-moments-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'pinned-moments-popup';
            popup.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 9999; display: none;
                justify-content: center; align-items: center;
            `;
            popup.innerHTML = `
                <div style="background: #fff; width: 80%; max-height: 70%; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column;">
                    <div style="padding: 15px; border-bottom: 1px solid #eee; font-weight: bold; text-align: center; position: relative;">
                        置顶朋友圈
                        <div class="close-pinned-popup" style="position: absolute; right: 15px; top: 15px; color: #999; cursor: pointer;"><i class="fas fa-times"></i></div>
                    </div>
                    <div class="pinned-moments-scroll" style="overflow-y: auto; padding: 15px; flex: 1; display: flex; flex-direction: column; gap: 15px;"></div>
                </div>
            `;
            document.body.appendChild(popup);

            popup.querySelector('.close-pinned-popup').addEventListener('click', () => {
                popup.style.display = 'none';
            });
            popup.addEventListener('click', (e) => {
                if (e.target === popup) popup.style.display = 'none';
            });
        }

        const listEl = popup.querySelector('.pinned-moments-scroll');
        listEl.innerHTML = '';

        moments.forEach((m) => {
            const item = document.createElement('div');
            item.className = 'pinned-popup-item';
            let mediaHtml = '';
            if (m.images && m.images.length > 0) {
                const firstImg = typeof m.images[0] === 'object' ? m.images[0].src : m.images[0];
                mediaHtml = `<img src="${firstImg}" style="width: 60px; height: 100%; object-fit: cover; border-radius: 4px; background: #f2f2f7;">`;
            } else {
                mediaHtml = `<div style="width: 60px; height: 60px; background: #f2f2f7; border-radius: 4px; padding: 5px; font-size: 10px; color: #333; overflow: hidden; display: flex; align-items: center; justify-content: center;">${m.text}</div>`;
            }

            const timeStr = window.imApp.formatTime ? window.imApp.formatTime(m.time) : '';

            item.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: flex-start;">
                    ${mediaHtml}
                    <div style="flex: 1;">
                        <div style="font-size: 14px; color: #333; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${m.text || '[图片]'}</div>
                        <div style="font-size: 12px; color: #999; margin-top: 4px;">${timeStr}</div>
                    </div>
                </div>
            `;
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                popup.style.display = 'none';
                openMomentDetail(m);
            });
            listEl.appendChild(item);
        });

        popup.style.display = 'flex';
    }

    function renderUserMomentsList(userId) {
        const list = document.getElementById('user-moments-list');
        if (!list) return;
        list.innerHTML = '';

        const filteredMoments = window.imData.moments.filter((m) => m.userId == userId || (userId === 'me' && m.userId === 'self'));

        if (filteredMoments.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #8e8e93; padding: 40px;">暂无动态</div>';
            return;
        }

        filteredMoments.sort((a, b) => b.time - a.time);

        const pinnedMoments = filteredMoments.filter((m) => m.isPinned);
        const normalMoments = filteredMoments.filter((m) => !m.isPinned);

        function createItemEl(m) {
            const itemEl = document.createElement('div');
            itemEl.className = 'user-moment-item';

            if (m.images && m.images.length > 0) {
                const firstImg = m.images[0];
                const src = typeof firstImg === 'object' ? firstImg.src : firstImg;

                itemEl.innerHTML = `
                    <div class="user-moment-media" style="width: 100%; height: 100%; overflow: hidden;">
                        <img src="${src}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    ${!m.isPinned && m.images.length > 1 ? `<div style="font-size: 12px; color: #8e8e93; margin-top: 5px;">共${m.images.length}张</div>` : ''}
                `;
            } else {
                if (m.isPinned) {
                    itemEl.innerHTML = `
                        <div class="user-moment-media text-only-moment-square" style="width: 100%; height: 100%; background: #f2f2f7; padding: 5px; overflow: hidden; font-size: 10px; color: #333;">
                            ${m.text}
                        </div>
                    `;
                } else {
                    itemEl.innerHTML = `
                        <div class="user-moment-text" style="background: #f2f2f7; padding: 10px; border-radius: 4px; width: 100%;">
                            ${m.text}
                        </div>
                    `;
                }
            }

            itemEl.addEventListener('click', () => {
                openMomentDetail(m);
            });
            return itemEl;
        }

        if (pinnedMoments.length > 0) {
            const pinnedGroupEl = document.createElement('div');
            pinnedGroupEl.className = 'user-moment-group pinned-group';

            const dateCol = document.createElement('div');
            dateCol.className = 'user-moment-date-col';
            dateCol.innerHTML = `<div class="user-moment-day" style="font-size: 16px; font-weight: bold; cursor: pointer;">置顶</div>`;

            dateCol.querySelector('.user-moment-day').addEventListener('click', () => {
                showPinnedPopup(pinnedMoments);
            });

            const contentCol = document.createElement('div');
            contentCol.className = 'user-moment-content-col';
            contentCol.style.display = 'flex';
            contentCol.style.flexWrap = 'wrap';
            contentCol.style.gap = '5px';

            pinnedMoments.forEach((m) => {
                const el = createItemEl(m);
                el.style.width = '80px';
                el.style.height = '80px';
                el.style.flex = '0 0 auto';
                contentCol.appendChild(el);
            });

            pinnedGroupEl.appendChild(dateCol);
            pinnedGroupEl.appendChild(contentCol);
            list.appendChild(pinnedGroupEl);
        }

        if (normalMoments.length > 0) {
            const groups = {};
            const today = new Date();

            normalMoments.forEach((m) => {
                const d = new Date(m.time);
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                if (!groups[key]) {
                    groups[key] = {
                        date: d,
                        items: []
                    };
                }
                groups[key].items.push(m);
            });

            Object.keys(groups).sort((a, b) => new Date(groups[b].date) - new Date(groups[a].date)).forEach((key) => {
                const group = groups[key];
                const groupEl = document.createElement('div');
                groupEl.className = 'user-moment-group';

                const dateCol = document.createElement('div');
                dateCol.className = 'user-moment-date-col';

                let dayStr = group.date.getDate().toString();
                let monthStr = (group.date.getMonth() + 1) + '月';
                let dayStyle = '';

                if (group.date.toDateString() === today.toDateString()) {
                    dayStr = '今天';
                    monthStr = '';
                    dayStyle = 'font-size: 16px; font-weight: bold;';
                }

                dateCol.innerHTML = `
                    <div class="user-moment-day" style="${dayStyle}">${dayStr}</div>
                    <div class="user-moment-month">${monthStr}</div>
                `;

                const contentCol = document.createElement('div');
                contentCol.className = 'user-moment-content-col';

                group.items.forEach((m) => {
                    contentCol.appendChild(createItemEl(m));
                });

                groupEl.appendChild(dateCol);
                groupEl.appendChild(contentCol);
                list.appendChild(groupEl);
            });
        }
    }

    // Expose Functions
    window.imApp.openMomentDetail = openMomentDetail;
    window.imApp.openUserMoments = openUserMoments;
    window.imApp.renderMoments = renderMoments;
    window.imApp.renderMomentsMessages = renderMomentsMessages;
    window.imApp.refreshAllMomentsViews = refreshAllMomentsViews;
});
