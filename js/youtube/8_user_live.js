// === User Live Setup & Interface ===
    const startLiveOptionBtn = ytCreateSheet ? ytCreateSheet.querySelectorAll('.yt-create-bubble-btn')[0] : null;
    
    const userLiveSetupSheet = document.getElementById('yt-user-live-setup-sheet');
    const startUserLiveBtn = document.getElementById('start-user-live-btn');
    const userLiveView = document.getElementById('yt-user-live-view');
    const userLiveBackBtn = document.getElementById('yt-user-live-back-btn');
    const userLiveVideoArea = document.getElementById('yt-user-live-video-area');

    let userLiveBgUrl = '';
    const userLiveBgUpload = document.getElementById('yt-user-live-bg-upload');
    const userLiveBgBtn = document.getElementById('yt-user-live-bg-btn');
    const userLiveBgImg = document.getElementById('yt-user-live-bg-img');

    function getCurrentYtLiveUser() {
        if (typeof window.getYtEffectiveUserState === 'function') {
            return window.getYtEffectiveUserState() || {};
        }
        return ytUserState || {};
    }

    if (userLiveBgBtn && userLiveBgUpload) {
        userLiveBgBtn.addEventListener('click', () => userLiveBgUpload.click());
        userLiveBgUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (window.compressImage) {
                        window.compressImage(ev.target.result, 900, 600, (compressedUrl) => {
                            userLiveBgUrl = compressedUrl;
                            if(userLiveBgImg) {
                                userLiveBgImg.src = userLiveBgUrl;
                                userLiveBgImg.style.display = 'block';
                            }
                            const liveDisplay = document.getElementById('yt-user-live-bg-display');
                            if(liveDisplay) {
                                liveDisplay.src = userLiveBgUrl;
                            }
                        });
                    } else {
                        userLiveBgUrl = ev.target.result;
                        if(userLiveBgImg) {
                            userLiveBgImg.src = userLiveBgUrl;
                            userLiveBgImg.style.display = 'block';
                        }
                        const liveDisplay = document.getElementById('yt-user-live-bg-display');
                        if(liveDisplay) {
                            liveDisplay.src = userLiveBgUrl;
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (startLiveOptionBtn && userLiveSetupSheet) {
        startLiveOptionBtn.addEventListener('click', () => {
            if(ytCreateSheet) ytCreateSheet.classList.remove('active');
            userLiveSetupSheet.classList.add('active');
        });
        userLiveSetupSheet.addEventListener('mousedown', (e) => {
            if(e.target === userLiveSetupSheet) userLiveSetupSheet.classList.remove('active');
        });
    }

    if (userLiveVideoArea && userLiveBgUpload) {
        userLiveVideoArea.addEventListener('click', (e) => {
            if (e.target.closest('#yt-user-live-bubbles-container') || e.target.closest('#yt-user-live-alert-container')) return;
            userLiveBgUpload.click();
        });
    }

    // Setup sheet confirm
    if (startLiveOptionBtn && userLiveSetupSheet) {
        // Redundant listeners might have been added by 2_core.js, but since 2_core handles showing the setup sheet, we don't strictly need to do it here again.
        // We will just keep the existing code logic for the background upload and starting the live.
    }

    if (startUserLiveBtn && userLiveView) {
        startUserLiveBtn.addEventListener('click', () => {
            const titleInput = document.getElementById('yt-user-live-title-input');
            const title = titleInput && titleInput.value ? titleInput.value : '我的直播间';

            document.getElementById('yt-user-live-title-display').textContent = title;
            if(userLiveBgUrl) {
                document.getElementById('yt-user-live-bg-display').src = userLiveBgUrl;
            } else {
                document.getElementById('yt-user-live-bg-display').src = 'https://picsum.photos/900/600';
            }

            userLiveSetupSheet.classList.remove('active');
            
            // Clean up old state
            document.getElementById('yt-user-live-chat-container').innerHTML = '';
            document.getElementById('yt-user-live-bubbles-container').innerHTML = '';
            document.getElementById('yt-user-live-alert-container').innerHTML = '';
            userLiveHistory = [];

            userLiveView.classList.add('active');
        });
    }

    if (userLiveBackBtn) {
        userLiveBackBtn.addEventListener('click', () => {
            window.showCustomModal({
                title: '结束直播',
                message: '确定要结束当前的直播吗？',
                confirmText: '结束',
                cancelText: '继续',
                isDestructive: true,
                onConfirm: () => {
                    userLiveView.classList.remove('active');
                    
                    document.getElementById('yt-summary-views').textContent = userLiveTotalViews;
                    document.getElementById('yt-summary-hot').textContent = userLiveMaxHot;
                    document.getElementById('yt-summary-subs').textContent = '+' + userLiveNewSubs;
                    document.getElementById('yt-summary-sc').textContent = '￥' + userLiveTotalSC;
                    
                    if(userLiveSummarySheet) userLiveSummarySheet.classList.add('active');
                }
            });
        });
    }

    // Data Center Logic
    window.renderDataCenter = function() {
        const dataCenterBtn = document.getElementById('yt-data-center-btn');
        const dataCenterSheet = document.getElementById('yt-data-center-sheet');
        const ytWithdrawBtn = document.getElementById('yt-withdraw-btn');
        const dcTotalViews = document.getElementById('dc-total-views');
        const dcTotalSc = document.getElementById('dc-total-sc');
        const dcTotalSubs = document.getElementById('dc-total-subs');
        const dcTotalCommission = document.getElementById('dc-total-commission');
        const dcTotalRevenue = document.getElementById('dc-total-revenue');
        const dcOffersList = document.getElementById('dc-offers-list');

        if (!channelState.dataCenter) {
            channelState.dataCenter = { views: 0, sc: 0, subs: 0, commission: 0 };
        }
        if (channelState.dataCenter.commission === undefined) channelState.dataCenter.commission = 0;

        if (dcTotalViews) dcTotalViews.textContent = channelState.dataCenter.views || 0;
        if (dcTotalSc) dcTotalSc.textContent = (channelState.dataCenter.sc || 0).toFixed(2);
        if (dcTotalSubs) dcTotalSubs.textContent = channelState.dataCenter.subs || 0;
        if (dcTotalCommission) dcTotalCommission.textContent = (channelState.dataCenter.commission || 0).toFixed(2);
        
        const total = parseFloat(channelState.dataCenter.sc || 0) + parseFloat(channelState.dataCenter.commission || 0);
        if (dcTotalRevenue) dcTotalRevenue.textContent = total.toFixed(2);
        
        if (ytWithdrawBtn) {
            if (total > 0) {
                ytWithdrawBtn.style.opacity = '1';
                ytWithdrawBtn.style.pointerEvents = 'auto';
            } else {
                ytWithdrawBtn.style.opacity = '0.5';
                ytWithdrawBtn.style.pointerEvents = 'none';
            }
        }

        if (dcOffersList) {
            dcOffersList.innerHTML = '';
            let hasOffers = false;

            mockSubscriptions.forEach(sub => {
                if (sub.dmHistory) {
                    sub.dmHistory.forEach(msg => {
                        if (msg.isOffer && msg.offerStatus === 'accepted') {
                            hasOffers = true;
                            const el = document.createElement('div');
                            el.className = 'settings-item';
                            el.style.padding = '12px 16px';
                            el.style.cursor = 'pointer';

                            const priceStr = msg.offerData.price || '0';

                            el.innerHTML = `
                                <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; margin-right: 12px; flex-shrink: 0;">
                                    <img src="${sub.avatar}" style="width: 100%; height: 100%; object-fit: cover;">
                                </div>
                                <div style="flex: 1; overflow: hidden;">
                                    <div style="font-weight: 600; font-size: 15px; color: #000; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${msg.offerData.title || '商单任务'}</div>
                                    <div style="font-size: 12px; color: #8e8e93; margin-top: 2px;">来自: ${sub.name}</div>
                                </div>
                                <div style="color: #ff3b30; font-weight: 600; font-size: 15px;">${priceStr}</div>
                            `;

                            el.addEventListener('click', () => {
                                // Set global current sub so the detail sheet context works
                                currentSubChannelData = sub;
                                openOfferDetailSheet(msg);
                            });

                            dcOffersList.appendChild(el);
                        }
                    });
                }
            });

            if (!hasOffers) {
                dcOffersList.innerHTML = '<div style="padding: 16px; text-align: center; color: #8e8e93; font-size: 14px;">暂无进行中的商单</div>';
            }
        }
        
        // Hide sheet handler
        if (dataCenterSheet && !dataCenterSheet.dataset.bound) {
            dataCenterSheet.dataset.bound = 'true';
            dataCenterSheet.addEventListener('mousedown', (e) => {
                if (e.target === dataCenterSheet) dataCenterSheet.classList.remove('active');
            });
        }
    };
    
    // Bind initial load just in case
    setTimeout(() => {
        const dataCenterBtn = document.getElementById('yt-data-center-btn');
        const dataCenterSheet = document.getElementById('yt-data-center-sheet');
        if (dataCenterBtn && dataCenterSheet && !dataCenterBtn.dataset.bound) {
            dataCenterBtn.dataset.bound = 'true';
            dataCenterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.renderDataCenter();
                dataCenterSheet.classList.add('active');
            });
        }
    }, 500);

    const ytWithdrawBtn = document.getElementById('yt-withdraw-btn');
    if (ytWithdrawBtn) {
        ytWithdrawBtn.addEventListener('click', () => {
            const total = parseFloat(channelState.dataCenter.sc || 0) + parseFloat(channelState.dataCenter.commission || 0);
            if (total <= 0) return;

            if (window.showCustomModal) {
                window.showCustomModal({
                    title: '收益提现',
                    message: `确认将 YouTube 创作者收益 ￥${total.toFixed(2)} 提现到 Pay 钱包吗？`,
                    confirmText: '确认提现',
                    cancelText: '取消',
                    onConfirm: () => {
                        // 重置收益
                        channelState.dataCenter.sc = 0;
                        channelState.dataCenter.commission = 0;
                        saveYoutubeData();
                        renderDataCenter();

                        // 同步到 Pay App
                        if (window.addPayTransaction) {
                            window.addPayTransaction(total, 'YouTube 创作者收益', 'income');
                        }

                        if(window.showToast) window.showToast('提现成功，已存入 Pay 钱包');
                    }
                });
            } else {
                if (confirm(`确认提现 ￥${total.toFixed(2)} 吗？`)) {
                    channelState.dataCenter.sc = 0;
                    channelState.dataCenter.commission = 0;
                    saveYoutubeData();
                    renderDataCenter();
                    if (window.addPayTransaction) window.addPayTransaction(total, 'YouTube 创作者收益', 'income');
                    alert('提现成功！');
                }
            }
        });
    }

    // User Live Chat & API interaction
    let userLiveHistory = [];
    let userLiveComments = [];
    let userLiveTotalSC = 0;
    let userLiveTotalViews = 0;
    let userLiveMaxHot = 0;
    let userLiveNewSubs = 0;

    const userLiveChatInput = document.getElementById('yt-user-live-chat-input');
    const userLiveChatSend = document.getElementById('yt-user-live-chat-send');
    const userLiveBubblesContainer = document.getElementById('yt-user-live-bubbles-container');
    const userLiveChatContainer = document.getElementById('yt-user-live-chat-container');
    const userLiveTriggerApiBtn = document.getElementById('yt-user-live-trigger-api-btn');

    if (startUserLiveBtn) {
        startUserLiveBtn.addEventListener('click', () => {
            userLiveComments = [];
            userLiveTotalSC = 0;
            userLiveTotalViews = Math.floor(Math.random() * 500) + 100;
            userLiveMaxHot = userLiveTotalViews;
            userLiveNewSubs = 0;
            const viewsEl = document.getElementById('yt-user-live-views-display');
            if(viewsEl) viewsEl.textContent = userLiveTotalViews + ' 人正在观看';
        });
    }

    const userLiveMinimizeBtn = document.getElementById('yt-user-live-minimize-btn');
    if (userLiveMinimizeBtn) {
        userLiveMinimizeBtn.addEventListener('click', () => {
            if(userLiveView) userLiveView.classList.remove('active');
            if(window.showToast) window.showToast('直播已最小化并在后台运行');
            
            // Generate a fake active live stream for the user in the channel list
            const effectiveYtUser = getCurrentYtLiveUser();
            if (effectiveYtUser) {
                const existingIndex = mockVideos.findIndex(v => v.channelData && v.channelData.id === 'user_channel_id');
                if(existingIndex > -1) mockVideos.splice(existingIndex, 1);
                
                const titleInput = document.getElementById('yt-user-live-title-input');
                const title = titleInput && titleInput.value ? titleInput.value : '我的直播间';

                const topicInput = document.getElementById('yt-user-live-topic-input');
                const topicDesc = topicInput && topicInput.value ? topicInput.value : '';
                
                mockVideos.unshift({
                    title: title,
                    desc: topicDesc,
                    views: userLiveTotalViews + ' 人正在观看',
                    time: 'LIVE',
                    thumbnail: userLiveBgUrl || 'https://picsum.photos/320/180',
                    isLive: true,
                    comments: [],
                    initialBubbles: [],
                    guest: userLiveSelectedGuest,
                    channelData: {
                        id: 'user_channel_id',
                        name: effectiveYtUser.name || '我',
                        avatar: effectiveYtUser.avatarUrl || 'https://picsum.photos/80/80',
                        subs: effectiveYtUser.subs || '0'
                    }
                });
                renderVideos();
            }
        });
    }

    const userLiveSummarySheet = document.getElementById('yt-user-live-summary-sheet');
    const ytSummaryConfirmBtn = document.getElementById('yt-summary-confirm-btn');

    if (userLiveSummarySheet) {
        userLiveSummarySheet.addEventListener('mousedown', (e) => {
            if (e.target === userLiveSummarySheet) userLiveSummarySheet.classList.remove('active');
        });
    }

    if (ytSummaryConfirmBtn && userLiveSummarySheet) {
        ytSummaryConfirmBtn.addEventListener('click', () => {
            userLiveSummarySheet.classList.remove('active');
            if(window.showToast) window.showToast('录播已保存至往期记录');
            
            const existingIndex = mockVideos.findIndex(v => v.channelData && v.channelData.id === 'user_channel_id');
            if(existingIndex > -1) mockVideos.splice(existingIndex, 1);

            // Update Data Center
            if (!channelState.dataCenter) {
                channelState.dataCenter = { views: 0, sc: 0, subs: 0 };
            }
            channelState.dataCenter.views += userLiveTotalViews;
            channelState.dataCenter.sc += userLiveTotalSC;
            if (!channelState.dataCenter.subs) channelState.dataCenter.subs = 0;
            channelState.dataCenter.subs += userLiveNewSubs;
            
            const effectiveYtUser = getCurrentYtLiveUser();
            if (effectiveYtUser) {
                const currentSubsNum = parseSubs(effectiveYtUser.subs);
                effectiveYtUser.subs = formatSubs(currentSubsNum + userLiveNewSubs);

                const currentNumStr = (effectiveYtUser.videos || '0').replace(/[^0-9]/g, '');
                let currentNum = parseInt(currentNumStr) || 0;
                effectiveYtUser.videos = (currentNum + 1).toString();
                ytUserState = effectiveYtUser;
                syncYtProfile();
            }

            // Save to Past Videos
            if (!channelState.pastVideos) channelState.pastVideos = [];
            const titleInput = document.getElementById('yt-user-live-title-input');
            const title = titleInput && titleInput.value ? titleInput.value : '我的直播间';

            const topicInput = document.getElementById('yt-user-live-topic-input');
            const topicDesc = topicInput && topicInput.value ? topicInput.value : '';
            
            const pastVid = {
                title: title,
                desc: topicDesc,
                views: userLiveTotalViews + ' 次观看',
                time: '刚刚',
                thumbnail: userLiveBgUrl || 'https://picsum.photos/seed/user_past/320/180?grayscale',
                comments: [...userLiveComments],
                guest: userLiveSelectedGuest 
            };
            channelState.pastVideos.unshift(pastVid);
            
            // Sync to Guest Profile
            if (userLiveSelectedGuest) {
                const guestSub = mockSubscriptions.find(s => s.id === userLiveSelectedGuest.id);
                if (guestSub) {
                    if (!guestSub.generatedContent) {
                        guestSub.generatedContent = { pastVideos: [], communityPosts: [], currentLive: null, fanGroup: null };
                    }
                    if (!guestSub.generatedContent.pastVideos) guestSub.generatedContent.pastVideos = [];
                    guestSub.generatedContent.pastVideos.unshift({
                        title: `【联动录播】${title}`,
                        views: Math.floor(userLiveTotalViews * 0.8) + ' 次观看',
                        time: '刚刚',
                        thumbnail: pastVid.thumbnail,
                        comments: [{name: effectiveYtUser.name || '我', text: '这把打得不错！'}],
                        guest: { name: effectiveYtUser.name || '我' }
                    });
                }
            }

            saveYoutubeData();

            renderVideos();
            
            // Force refresh profile tab if active
            const activeTab = document.querySelector('#profile-main-tabs .yt-sliding-tab.active');
            if (activeTab && activeTab.getAttribute('data-target') === 'past') {
                activeTab.click(); 
            }
        });
    }

    if (userLiveChatSend && userLiveChatInput) {
        const sendAction = () => {
            const text = userLiveChatInput.value.trim();
            if(!text) return;

            userLiveHistory.push({ type: 'host', text: text });
            
            // Create bubble on screen
            const bubble = document.createElement('div');
            bubble.className = 'yt-user-live-bubble';
            bubble.textContent = text;
            userLiveBubblesContainer.appendChild(bubble);

            setTimeout(() => {
                bubble.style.opacity = '0';
                bubble.style.transition = 'opacity 1s ease';
                setTimeout(() => bubble.remove(), 1000);
            }, 8000);

            userLiveChatInput.value = '';
        };

        userLiveChatSend.addEventListener('click', sendAction);
        userLiveChatInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') sendAction();
        });
    }

    if (userLiveTriggerApiBtn) {
        userLiveTriggerApiBtn.addEventListener('click', async () => {
            if (!window.apiConfig || !window.apiConfig.endpoint || !window.apiConfig.apiKey) {
                if(window.showToast) window.showToast('请配置API');
                return;
            }

            userLiveTriggerApiBtn.style.opacity = '0.5';
            userLiveTriggerApiBtn.style.pointerEvents = 'none';
            userLiveTriggerApiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 等待中';

            let wbContext = '';
            if (channelState && channelState.boundWorldBookIds && Array.isArray(channelState.boundWorldBookIds) && window.getWorldBooks) {
                const wbs = window.getWorldBooks();
                channelState.boundWorldBookIds.forEach(id => {
                    const boundWb = wbs.find(w => w.id === id);
                    if (boundWb && boundWb.entries) {
                        wbContext += `\n【${boundWb.name}】:\n` + boundWb.entries.map(e => `${e.keyword}: ${e.content}`).join('\n');
                    }
                });
            }

            const effectiveYtUser = getCurrentYtLiveUser();
            const hostName = effectiveYtUser.name || '我';
            const hostPersona = effectiveYtUser.persona || '普通主播';
            const recentHostMsg = userLiveHistory.slice(-5).map(m => m.text).join(' | ');

            let guestContextStr = userLiveSelectedGuest 
                ? `\n特别注意：本场直播你邀请的联动嘉宾是"${userLiveSelectedGuest.name}"，ta的人设："${userLiveSelectedGuest.desc || '未知'}"。观众的反应可能会带有对嘉宾的互动和评价。`
                : "";

            const prompt = `我（${hostName}）正在进行YouTube直播。我的人设是：${hostPersona}。${guestContextStr}
世界观设定：${wbContext}
我刚刚在直播里说了/做了这些事情："${recentHostMsg}"。

请根据世界书、我的人设和我刚刚发送的内容，生成观众对我的实时反应。要求生成5-10条评论和0-2条SC。
返回严格的JSON格式，必须完全符合以下结构：
{
  "comments": [
    {"name": "观众1", "text": "弹幕内容"},
    {"name": "观众2", "text": "弹幕内容"}
  ],
  "superchats": [
    {"name": "土豪", "text": "留言", "displayAmount": "$50", "amount": 350, "color": "#e65100"}
  ],
  "newSubs": ["新粉丝A", "新粉丝B"]
}
要求：
1. comments 必须包含 5 到 10 条评论，符合直播间氛围。
2. superchats 必须包含 0 到 2 条打赏，必须根据国籍特征显示不同货币。displayAmount 是带符号的展示金额，amount 是换算成人民币的纯数字。
3. newSubs 可以为空数组 []，或者包含 1-3 个名字。
4. 绝对不要返回 Markdown 标记，只能返回纯JSON。
5. 绝对不要使用任何 Emoji 表情符号，所有回复的句子末尾不要使用句号，活人感一点。`;

            try {
                let endpoint = window.apiConfig.endpoint;
                if(endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
                if(!endpoint.endsWith('/chat/completions')) {
                    endpoint = endpoint.endsWith('/v1') ? endpoint + '/chat/completions' : endpoint + '/v1/chat/completions';
                }

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.apiConfig.apiKey}`
                    },
                    body: JSON.stringify({
                        model: window.apiConfig.model || 'gpt-3.5-turbo',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.8,
                        response_format: { type: "json_object" } 
                    })
                });

                if (!res.ok) throw new Error("API failed");
                const data = await res.json();
                let resultText = data.choices[0].message.content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
                
                let parsed;
                try {
                    parsed = sanitizeObj(JSON.parse(resultText));
                } catch (parseErr) {
                    console.error("JSON Parse Error in Live Audience:", parseErr, resultText);
                    if(window.showToast) window.showToast('观众反应格式生成失败，请重试');
                    return;
                }

                // Simulate Streaming
                let totalDelay = 0;
                
                // Add Comments
                if (parsed.comments && Array.isArray(parsed.comments)) {
                    parsed.comments.forEach(c => {
                        totalDelay += Math.floor(Math.random() * 1500) + 500;
                        setTimeout(() => {
                            addUserLiveChatMessage(c.name, c.text, null, null);
                        }, totalDelay);
                    });
                }

                // Add SC
                if (parsed.superchats && Array.isArray(parsed.superchats)) {
                    parsed.superchats.forEach(sc => {
                        totalDelay += 2000;
                        setTimeout(() => {
                            addUserLiveChatMessage(sc.name, sc.text, sc.displayAmount || sc.amount, sc.color);
                            const amountNum = parseFloat(sc.amount) || 0;
                            userLiveTotalSC += amountNum;
                        }, totalDelay);
                    });
                }

                // Add Subs Alerts
                const alertContainer = document.getElementById('yt-user-live-alert-container');
                if (parsed.newSubs && Array.isArray(parsed.newSubs) && alertContainer) {
                    parsed.newSubs.forEach(subName => {
                        setTimeout(() => {
                            const alert = document.createElement('div');
                            alert.className = 'yt-user-live-alert';
                            alert.innerHTML = `<i class="fas fa-bell"></i> ${subName} 刚刚订阅了你！`;
                            
                            // random vertical position
                            alert.style.top = Math.floor(Math.random() * 80) + '%';
                            
                            alertContainer.appendChild(alert);
                            setTimeout(() => alert.remove(), 5000);
                            
                            userLiveNewSubs += 1;
                            
                            // increment viewer count
                            const viewsEl = document.getElementById('yt-user-live-views-display');
                            if(viewsEl) {
                                let currentNum = parseInt(viewsEl.textContent) || 0;
                                const addedViews = Math.floor(Math.random() * 50) + 10;
                                currentNum += addedViews;
                                userLiveTotalViews += addedViews;
                                if(userLiveTotalViews > userLiveMaxHot) userLiveMaxHot = userLiveTotalViews;
                                viewsEl.textContent = currentNum + ' 人正在观看';
                            }
                        }, Math.floor(Math.random() * totalDelay));
                    });
                }

            } catch (e) {
                console.error(e);
                if(window.showToast) window.showToast('无法获取观众反应');
            } finally {
                userLiveTriggerApiBtn.style.opacity = '1';
                userLiveTriggerApiBtn.style.pointerEvents = 'auto';
                userLiveTriggerApiBtn.innerHTML = '<i class="fas fa-magic"></i>';
            }
        });
    }

    function addUserLiveChatMessage(name, text, amount, color) {
        if (!userLiveChatContainer) return;
        userLiveComments.push({ name: name, text: text });

        const row = document.createElement('div');
        
        if (amount) {
            let displayAmount = amount;
            if (typeof amount === 'number' || /^\d+(\.\d+)?$/.test(String(amount))) {
                displayAmount = '￥' + amount;
            }
            row.style.backgroundColor = color || '#8e8e93';
            row.style.padding = '8px 12px';
            row.style.borderRadius = '8px';
            row.style.marginBottom = '4px';
            row.innerHTML = `
                <div style="font-weight: bold; font-size: 13px; color: rgba(255,255,255,0.9); margin-bottom: 4px;">${name} <span style="margin-left: 8px;">${displayAmount}</span></div>
                <div style="font-size: 14px; color: #fff;">${text}</div>
            `;
        } else {
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.alignItems = 'flex-start';
            row.style.marginBottom = '12px';
            
            const grayColors = ['#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3'];
            const randColor = grayColors[Math.floor(Math.random() * grayColors.length)];
            
            row.innerHTML = `
                <div style="width:24px; height:24px; border-radius:50%; background-color:${randColor}; display:flex; justify-content:center; align-items:center; color:#fff; font-size:10px; font-weight:bold; flex-shrink:0;">
                    ${name && name.length > 0 ? name[0].toUpperCase() : '?'}
                </div>
                <div style="font-size:13px; margin-top:2px;">
                    <span style="font-size:12px; margin-right:4px; color:#606060;">${name}</span>
                    <span style="color:#0f0f0f;">${text}</span>
                </div>
            `;
        }
        
        userLiveChatContainer.appendChild(row);
        userLiveChatContainer.scrollTop = userLiveChatContainer.scrollHeight;
    }
