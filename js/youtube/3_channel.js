// 8. Sub Channel View Logic
    const subChannelBackBtn = document.getElementById('sub-channel-back-btn');
    const subChannelContent = document.getElementById('sub-channel-content');
    const subChannelSubscribeBtn = document.getElementById('sub-channel-subscribe-btn');

    let currentSubChannelData = null;

    function openSubChannelView(sub) {
        try {
            if (!subChannelView) return;
            currentSubChannelData = sub;

            const nameEl = document.getElementById('sub-channel-name');
            if (nameEl) nameEl.textContent = sub.name || '未知';

            const handleEl = document.getElementById('sub-channel-handle');
            if (handleEl) {
                const handleText = sub.handle || (sub.name ? sub.name.toLowerCase().replace(/\s+/g, '') : 'unknown');
                handleEl.textContent = `@${handleText}`;
            }

            const avatarEl = document.getElementById('sub-channel-avatar');
            if (avatarEl) {
                avatarEl.src = sub.avatar || 'https://picsum.photos/80/80?grayscale';
                avatarEl.style.display = 'block';
            }
            
            const subBannerEl = document.getElementById('sub-channel-banner');
            if (subBannerEl) {
                if (sub.banner) {
                    subBannerEl.style.backgroundImage = `url('${sub.banner}')`;
                } else {
                    subBannerEl.style.backgroundImage = 'none';
                }
            }
            
            const displaySubs = sub.subs || '1.2万';
            const displayVideos = sub.videos || '45';
            
            const subsEl = document.getElementById('sub-channel-subs');
            if (subsEl) subsEl.textContent = `${displaySubs} 订阅者`;
            
            const videosEl = document.getElementById('sub-channel-videos');
            if (videosEl) videosEl.textContent = `${displayVideos} 视频`;
            
            if (subChannelContent) subChannelContent.innerHTML = ``;
            
            const tabsContainer = document.getElementById('sub-channel-tabs');
            if (tabsContainer) {
                const tabs = tabsContainer.querySelectorAll('.yt-sliding-tab');
                tabs.forEach(t => t.classList.remove('active'));
                if (tabs.length > 0) {
                    tabs[0].classList.add('active');
                    const indicator = tabsContainer.querySelector('.yt-tab-indicator');
                    if (indicator) updateSlidingIndicator(tabs[0], indicator);
                }
            }

            const foundSub = mockSubscriptions.find(s => s.id === sub.id);
            const isSubbed = foundSub && foundSub.isSubscribed !== false;
            if (subChannelSubscribeBtn) {
                if (isSubbed) {
                    subChannelSubscribeBtn.textContent = '已订阅';
                    subChannelSubscribeBtn.classList.add('subscribed');
                } else {
                    subChannelSubscribeBtn.textContent = '订阅';
                    subChannelSubscribeBtn.classList.remove('subscribed');
                }
            }

            subChannelView.classList.add('active');
            
            if(sub.generatedContent) {
                renderGeneratedContent('live');
            } else {
                renderGeneratedContent('live'); 
            }
            
            // Add click listener to video cards inside sub-channel
            setTimeout(() => {
                const subVideoCards = subChannelContent.querySelectorAll('.yt-video-card');
                subVideoCards.forEach(card => {
                    card.addEventListener('click', () => {
                        const titleEl = card.querySelector('.yt-video-title');
                        if(titleEl) {
                            const video = mockVideos.find(v => v.title === titleEl.textContent && v.channelData && v.channelData.id === sub.id);
                            if(video) openVideoPlayer(video);
                        }
                    });
                });
            }, 100);
        } catch (e) {
            console.error("Error opening sub channel view:", e);
            if(window.showToast) window.showToast('无法打开主页，出现异常');
        }
    }

    if (subChannelBackBtn) {
        subChannelBackBtn.addEventListener('click', () => {
            if (subChannelView) subChannelView.classList.remove('active');
        });
    }

    if (subChannelSubscribeBtn) {
        subChannelSubscribeBtn.addEventListener('click', function() {
            if (!currentSubChannelData) return;

            const subId = currentSubChannelData.id;
            const existingIndex = mockSubscriptions.findIndex(s => s.id === subId);

            if (this.classList.contains('subscribed')) {
                this.classList.remove('subscribed');
                this.textContent = '订阅';
                
                if (existingIndex > -1) {
                    mockSubscriptions[existingIndex].isSubscribed = false;
                    const realSubs = mockSubscriptions.filter(s => s.isSubscribed !== false);
                    hasSubscriptions = realSubs.length > 0;
                    renderSubscriptions(); 
                    
                    // Bug Fix: Update the list visually
                    renderVideos();
                }
            } else {
                this.classList.add('subscribed');
                this.textContent = '已订阅';
                
                if (existingIndex === -1) {
                    currentSubChannelData.isSubscribed = true;
                    mockSubscriptions.push(currentSubChannelData);
                } else {
                    mockSubscriptions[existingIndex].isSubscribed = true;
                }
                hasSubscriptions = true;
                renderSubscriptions();
                renderVideos();
            }
            saveYoutubeData();
        });
    }

    function updateSlidingIndicator(activeTab, indicator) {
        if (!activeTab || !indicator) return;
        indicator.style.width = `${activeTab.offsetWidth}px`;
        indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    }

    function initSlidingTabs(containerId, onChangeCallback) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const tabs = container.querySelectorAll('.yt-sliding-tab');
        const indicator = container.querySelector('.yt-tab-indicator');

        setTimeout(() => {
            const active = container.querySelector('.yt-sliding-tab.active') || tabs[0];
            updateSlidingIndicator(active, indicator);
        }, 50);

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                updateSlidingIndicator(tab, indicator);
                if (onChangeCallback) {
                    onChangeCallback(tab.getAttribute('data-target') || tab.textContent.trim());
                }
            });
        });
    }

    initSlidingTabs('profile-main-tabs', (target) => {
        const container = document.getElementById('yt-profile-content-list');
        if(!container) return;
        
        container.innerHTML = '';
        
        if(target === 'live') {
            const activeLive = mockVideos.find(v => v.channelData && v.channelData.id === 'user_channel_id');
            if (activeLive) {
                const el = document.createElement('div');
                el.innerHTML = `
                    <div class="yt-video-card yt-live-pin-card" style="margin: 16px;">
                        <div class="yt-video-thumbnail">
                            <img src="${activeLive.thumbnail}" alt="Live">
                            <div class="yt-live-badge"><i class="fas fa-broadcast-tower" style="font-size: 10px;"></i> LIVE</div>
                        </div>
                        <div class="yt-video-info" style="padding: 12px;">
                            <div class="yt-video-details">
                                <h3 class="yt-video-title">${activeLive.title || '无标题'}</h3>
                                <p class="yt-video-meta">${activeLive.views || '正在观看'}</p>
                            </div>
                        </div>
                    </div>
                `;
                el.querySelector('.yt-video-card').addEventListener('click', () => {
                    const userLiveView = document.getElementById('yt-user-live-view');
                    if (userLiveView) userLiveView.classList.add('active');
                });
                container.appendChild(el);
            } else {
                container.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; padding: 40px 20px; color: #8e8e93;">
                        <i class="fas fa-video-slash" style="font-size: 40px; margin-bottom: 10px; color: #d1d1d6;"></i>
                        <p style="font-size: 14px;">暂未开播</p>
                    </div>
                `;
            }
        } else if (target === 'past') {
            if (channelState.pastVideos && channelState.pastVideos.length > 0) {
                const listWrapper = document.createElement('div');
                listWrapper.className = 'yt-history-list';
                listWrapper.style.padding = '16px';
                
                channelState.pastVideos.forEach((v, index) => {
                    const item = document.createElement('div');
                    item.className = 'yt-history-item';
                    item.style.position = 'relative';
                    item.innerHTML = `
                        <div class="yt-history-thumb">
                            <img src="${v.thumbnail}" alt="VOD">
                            <div class="yt-history-time">${Math.floor(Math.random() * 2)+1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}</div>
                        </div>
                        <div class="yt-history-info">
                            <h3 class="yt-history-title">${v.title || '无标题'}</h3>
                            <p class="yt-history-meta">${v.views || '0 次观看'} • ${v.time || '刚刚'}</p>
                        </div>
                        <div class="yt-history-delete-btn" style="position: absolute; right: 10px; top: 10px; background: rgba(0,0,0,0.5); width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: #fff; cursor: pointer; z-index: 10;">
                            <i class="fas fa-trash-alt" style="font-size: 12px;"></i>
                        </div>
                    `;
                    item.addEventListener('click', (e) => {
                        if (e.target.closest('.yt-history-delete-btn')) {
                            e.stopPropagation();
                            window.showCustomModal({
                                title: '删除视频',
                                message: '确定要删除这个往期视频吗？',
                                confirmText: '删除',
                                cancelText: '取消',
                                isDestructive: true,
                                onConfirm: () => {
                                    channelState.pastVideos.splice(index, 1);
                                    saveYoutubeData();
                                    const activeTab = document.querySelector('#profile-main-tabs .yt-sliding-tab.active');
                                    if(activeTab) activeTab.click();
                                    if(window.showToast) window.showToast('视频已删除');
                                }
                            });
                            return;
                        }
                        openVideoPlayer({
                            title: v.title,
                            views: v.views,
                            thumbnail: v.thumbnail,
                            isLive: false,
                            guest: v.guest || null,
                            channelData: {
                                id: 'user_channel_id',
                                name: ytUserState ? ytUserState.name : '我',
                                avatar: ytUserState ? ytUserState.avatarUrl : 'https://picsum.photos/80/80?grayscale',
                                subs: ytUserState ? ytUserState.subs : '0'
                            },
                            comments: v.comments || []
                        });
                    });
                    listWrapper.appendChild(item);
                });
                container.appendChild(listWrapper);
            } else {
                container.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; padding: 40px 20px; color: #8e8e93;">
                        <i class="fas fa-film" style="font-size: 40px; margin-bottom: 10px; color: #d1d1d6;"></i>
                        <p style="font-size: 14px;">暂无往期视频</p>
                    </div>
                `;
            }
        } else if (target === 'community') {
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; padding: 40px 20px; color: #8e8e93;">
                    <i class="fas fa-users" style="font-size: 40px; margin-bottom: 10px; color: #d1d1d6;"></i>
                    <p style="font-size: 14px;">暂无社群动态</p>
                </div>
            `;
        }
    });

    initSlidingTabs('sub-channel-tabs', (target) => {
        renderGeneratedContent(target);
    });

    const addYtCharSheet = document.getElementById('add-yt-char-sheet');
    const ytCharAvatarWrapper = document.getElementById('yt-char-avatar-wrapper');
    const ytCharAvatarUpload = document.getElementById('yt-char-avatar-upload');
    const ytCharAvatarImg = document.getElementById('yt-char-avatar-img');
    const ytCharBannerBtn = document.getElementById('yt-char-banner-btn');
    const ytCharBannerUpload = document.getElementById('yt-char-banner-upload');
    const ytCharBannerImg = document.getElementById('yt-char-banner-img');
    const confirmAddYtCharBtn = document.getElementById('confirm-add-yt-char-btn');
    const charNameInput = document.getElementById('yt-char-name-input');
    const charHandleInput = document.getElementById('yt-char-handle-input');
    const charDescInput = document.getElementById('yt-char-desc-input');
    const charSubsInput = document.getElementById('yt-char-subs-input');
    const charVideosInput = document.getElementById('yt-char-videos-input');
    const charAvatarIcon = document.getElementById('yt-char-avatar-preview')?.querySelector('i');

    let isEditingChar = false;

    function openCustomCharSheet(charData = null) {
        if(addYtCharSheet) {
            if (charData) {
                isEditingChar = true;
                const titleEl = addYtCharSheet.querySelector('.sheet-title');
                if(titleEl) titleEl.textContent = '编辑频道角色';
                if(confirmAddYtCharBtn) confirmAddYtCharBtn.textContent = '保存修改';
                
                if(charNameInput) charNameInput.value = charData.name || '';
                if(charHandleInput) charHandleInput.value = (charData.handle || charData.name.toLowerCase().replace(/\s+/g, '')) || '';
                if(charDescInput) charDescInput.value = charData.desc || '';
                if(charSubsInput) charSubsInput.value = charData.subs || '';
                if(charVideosInput) charVideosInput.value = charData.videos || '';
                
                const liveTopicInput = document.getElementById('yt-char-live-topic-input');
                if (liveTopicInput) liveTopicInput.value = charData.liveTopic || '';
                
                if(ytCharAvatarImg && charData.avatar) {
                    ytCharAvatarImg.src = charData.avatar;
                    ytCharAvatarImg.style.display = 'block';
                    if(charAvatarIcon) charAvatarIcon.style.display = 'none';
                }
                
                if(ytCharBannerImg && charData.banner) {
                    ytCharBannerImg.src = charData.banner;
                    ytCharBannerImg.style.display = 'block';
                } else if (ytCharBannerImg) {
                    ytCharBannerImg.style.display = 'none';
                }
            } else {
                isEditingChar = false;
                const titleEl = addYtCharSheet.querySelector('.sheet-title');
                if(titleEl) titleEl.textContent = '自定义频道角色';
                if(confirmAddYtCharBtn) confirmAddYtCharBtn.textContent = '生成频道并开播';
                
                if(charNameInput) charNameInput.value = '';
                if(charHandleInput) charHandleInput.value = '';
                if(charDescInput) charDescInput.value = '';
                if(charSubsInput) charSubsInput.value = '';
                if(charVideosInput) charVideosInput.value = '';
                
                const liveTopicInput = document.getElementById('yt-char-live-topic-input');
                if (liveTopicInput) liveTopicInput.value = '';
                
                if(ytCharAvatarImg) { ytCharAvatarImg.src = ''; ytCharAvatarImg.style.display = 'none'; }
                if(charAvatarIcon) charAvatarIcon.style.display = 'block';
                if(ytCharBannerImg) { ytCharBannerImg.src = ''; ytCharBannerImg.style.display = 'none'; }
            }
            
            addYtCharSheet.classList.add('active');
        }
    }

    const mainSearchBtn = document.getElementById('yt-main-search-btn');
    const mainSettingsBtn = document.getElementById('yt-main-settings-btn');
    
    const openCreateSheetHandler = (e) => {
        e.stopPropagation();
        openCustomCharSheet(null);
    };

    const openYoutubeSettingsHandler = (e) => {
        e.stopPropagation();
        if (typeof updateYtBoundWorldBookLabel === 'function') {
            updateYtBoundWorldBookLabel();
        }
        const ytSettingsSheet = document.getElementById('yt-settings-sheet');
        if (ytSettingsSheet) ytSettingsSheet.classList.add('active');
    };

    if (mainSearchBtn) mainSearchBtn.addEventListener('click', openCreateSheetHandler);
    if (mainSettingsBtn) mainSettingsBtn.addEventListener('click', openYoutubeSettingsHandler);

    const charEditBtn = document.getElementById('yt-char-edit-btn');
    if (charEditBtn) {
        charEditBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentSubChannelData) {
                openCustomCharSheet(currentSubChannelData);
            }
        });
    }

    if (ytCharAvatarWrapper && ytCharAvatarUpload) {
        ytCharAvatarWrapper.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                e.preventDefault();
                ytCharAvatarUpload.click();
            }
        });
        ytCharAvatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (window.compressImage) {
                        window.compressImage(event.target.result, 300, 300, (compressedUrl) => {
                            if(ytCharAvatarImg) {
                                ytCharAvatarImg.src = compressedUrl;
                                ytCharAvatarImg.style.display = 'block';
                            }
                            if(charAvatarIcon) charAvatarIcon.style.display = 'none';
                        });
                    } else {
                        if(ytCharAvatarImg) {
                            ytCharAvatarImg.src = event.target.result;
                            ytCharAvatarImg.style.display = 'block';
                        }
                        if(charAvatarIcon) charAvatarIcon.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (ytCharBannerBtn && ytCharBannerUpload) {
        ytCharBannerBtn.addEventListener('click', () => ytCharBannerUpload.click());
        ytCharBannerUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (window.compressImage) {
                        window.compressImage(event.target.result, 800, 800, (compressedUrl) => {
                            if (ytCharBannerImg) {
                                ytCharBannerImg.src = compressedUrl;
                                ytCharBannerImg.style.display = 'block';
                            }
                        });
                    } else {
                        if (ytCharBannerImg) {
                            ytCharBannerImg.src = event.target.result;
                            ytCharBannerImg.style.display = 'block';
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (confirmAddYtCharBtn) {
        confirmAddYtCharBtn.addEventListener('click', () => {
            const name = charNameInput?.value.trim() || '神秘新星';
            const handle = charHandleInput?.value.trim() || name.toLowerCase().replace(/\s+/g, '');
            const desc = charDescInput?.value.trim() || '这个频道很神秘，什么都没写...';
            const subs = charSubsInput?.value.trim() || '1.2万';
            const videos = charVideosInput?.value.trim() || '10';
            
            const liveTopicInput = document.getElementById('yt-char-live-topic-input');
            const liveTopic = liveTopicInput ? liveTopicInput.value.trim() : '';
            
            let avatarUrl = 'https://picsum.photos/seed/' + Math.random() + '/80/80?grayscale';
            if (ytCharAvatarImg && ytCharAvatarImg.style.display === 'block' && ytCharAvatarImg.src) {
                avatarUrl = ytCharAvatarImg.src;
            } else if (isEditingChar && currentSubChannelData && currentSubChannelData.avatar) {
                avatarUrl = currentSubChannelData.avatar; 
            }

            let bannerUrl = null;
            if (ytCharBannerImg && ytCharBannerImg.style.display === 'block' && ytCharBannerImg.src) {
                bannerUrl = ytCharBannerImg.src;
            } else if (isEditingChar && currentSubChannelData && currentSubChannelData.banner) {
                bannerUrl = currentSubChannelData.banner;
            }

            if (isEditingChar && currentSubChannelData) {
                // Update
                currentSubChannelData.name = name;
                currentSubChannelData.handle = handle;
                currentSubChannelData.desc = desc;
                currentSubChannelData.subs = subs;
                currentSubChannelData.videos = videos;
                currentSubChannelData.avatar = avatarUrl;
                currentSubChannelData.banner = bannerUrl;
                currentSubChannelData.liveTopic = liveTopic;
                
                const subIndex = mockSubscriptions.findIndex(s => s.id === currentSubChannelData.id);
                if (subIndex > -1) {
                    mockSubscriptions[subIndex] = currentSubChannelData;
                }
                
                renderSubscriptions();
                openSubChannelView(currentSubChannelData);
                if (window.showToast) window.showToast('角色信息已更新！');
                
            } else {
                // Create
                const newCharData = {
                    id: 'char_custom_' + Date.now(),
                    name: name,
                    handle: handle,
                    avatar: avatarUrl,
                    banner: bannerUrl,
                    isLive: true,
                    desc: desc,
                    subs: subs,
                    videos: videos,
                    isFriend: false,
                    isBusiness: false,
                    liveTopic: liveTopic,
                    isSubscribed: true // Default subscribed
                };

                if (!mockSubscriptions.some(s => s.id === newCharData.id)) {
                    mockSubscriptions.push(newCharData);
                    hasSubscriptions = true;
                }

                renderSubscriptions();
                openSubChannelView(newCharData);
                if (window.showToast) window.showToast('频道已生成，默认已订阅！');
            }
            saveYoutubeData();
            if(addYtCharSheet) addYtCharSheet.classList.remove('active');
        });
    }

    if (addYtCharSheet) {
        addYtCharSheet.addEventListener('mousedown', (e) => {
            if (e.target === addYtCharSheet) {
                addYtCharSheet.classList.remove('active');
            }
        });
    }

    window.openSubChannelView = openSubChannelView;
    window.openCustomCharSheet = openCustomCharSheet;
