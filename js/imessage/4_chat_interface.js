
// ==========================================
// IMESSAGE: 4_chat_interface.js
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const { apiConfig, userState } = window;
    window.imChat = window.imChat || {};
    const imChat = window.imChat;

async function openChatTab(friend) {
        const chatsContent = document.getElementById('chats-content');
        const navChatsBtn = document.getElementById('nav-chats-btn');

        if (window.imApp.ensureFriendMessagesLoaded) {
            await window.imApp.ensureFriendMessagesLoaded(friend, {
                onLoaded: (_, loadedFriend) => {
                    if (window.imData.currentActiveFriend && String(window.imData.currentActiveFriend.id) === String(loadedFriend.id)) {
                        window.imData.currentActiveFriend = loadedFriend;
                    }
                }
            });
        }

        const activeFriend = (window.imData.friends || []).find(
            item => String(item.id) === String(friend.id)
        ) || friend;

        window.imData.currentActiveFriend = activeFriend;
        friend = activeFriend;
        let pageId = `chat-interface-${friend.id}`;
        let page = document.getElementById(pageId);

        if (page) {
            const msgContainer = page.querySelector('.ins-chat-messages');
            if (msgContainer) msgContainer.innerHTML = '';
        }

        if (!page) {
            page = document.createElement('div');
            page.id = pageId;
            page.className = 'active-chat-interface';
            page.style.display = 'none';
            page.style.position = 'relative';
            
            let avatarHtml;
            if (friend.type === 'group') {
                avatarHtml = friend.avatarUrl 
                    ? `<img src="${friend.avatarUrl}" style="display: block;">` 
                    : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #ff9a9e, #fecfef); color: white; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 20px;">${friend.nickname.charAt(0).toUpperCase()}</div>`;
            } else {
                avatarHtml = friend.avatarUrl 
                    ? `<img src="${friend.avatarUrl}" style="display: block;">` 
                    : `<i class="fas fa-user"></i>`;
            }

            const isSleeping = window.imApp.isCharacterSleeping(friend);
            const statusLabel = isSleeping ? 'offline' : 'online';
            const statusColor = isSleeping ? '#8e8e93' : '#34c759';

            const headerStyle = friend.type === 'group' 
                ? `position: relative; top: 0; padding: 0 16px; align-items: center; justify-content: space-between; display: flex; pointer-events: none; width: 100%;`
                : `position: relative; top: 0; padding: 0 16px; align-items: center;`;
                
            let titleHtml = '';
            if (friend.type === 'group') {
                titleHtml = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0; padding: 4px 16px; background: rgba(242, 242, 247, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 40px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); pointer-events: auto;">
                        <div class="ins-chat-name" style="font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${friend.nickname}</div>
                        <div class="ins-chat-sign" style="font-size: 11px; font-weight: 500; color: #8e8e93; margin-top: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px;">${(friend.members ? friend.members.length : 0) + 1} member${(friend.members ? friend.members.length : 0) + 1 > 1 ? 's' : ''}</div>
                   </div>`;
            } else if (friend.type === 'official') {
                titleHtml = `<div style="position: relative; display: inline-block;">
                        <div class="ins-chat-avatar" style="margin: 0; width: 44px; height: 44px; pointer-events: none;">
                            ${avatarHtml}
                        </div>
                   </div>
                   <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; margin-left: 8px; gap: 1px;">
                        <div class="ins-chat-name" style="font-size: 16px; font-weight: 600; line-height: 1.05;">${friend.nickname}</div>
                        <div class="ins-chat-sign" style="font-size: 13px; color: #8e8e93; display: flex; align-items: center; gap: 4px; margin-top: 0; line-height: 1;"><div style="width:6px;height:6px;border-radius:50%;background:${statusColor}; flex-shrink:0;"></div><span>${statusLabel}</span></div>
                   </div>`;
            } else {
                titleHtml = `<div style="position: relative; display: inline-block;">
                        <div class="ins-chat-avatar" style="margin: 0; width: 44px; height: 44px;">
                            ${avatarHtml}
                        </div>
                   </div>
                   <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; margin-left: 8px; gap: 1px;">
                        <div class="ins-chat-name" style="font-size: 16px; line-height: 1.05;">${friend.nickname}</div>
                        <div class="ins-chat-sign" style="font-size: 13px; color: #8e8e93; display: flex; align-items: center; gap: 4px; margin-top: 0; line-height: 1;"><div style="width:6px;height:6px;border-radius:50%;background:${statusColor}; flex-shrink:0;"></div><span>${statusLabel}</span></div>
                   </div>`;
            }

            // Make the right avatar a floating bubble as well
            let groupRightAvatarHtml = '';
            if (friend.type === 'group') {
                groupRightAvatarHtml = `<div class="group-header-right-avatar" style="width: 36px; height: 36px; border-radius: 50%; background: rgba(242, 242, 247, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; justify-content: center; align-items: center; overflow: hidden; flex-shrink: 0; pointer-events: auto; cursor: pointer;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; display: flex; justify-content: center; align-items: center; background: #e5e5ea;">${avatarHtml}</div>
                   </div>`;
            } else if (friend.type === 'official') {
                groupRightAvatarHtml = `<div class="chat-menu-btn" style="cursor: pointer; padding: 5px; font-size: 18px;"><i class="fas fa-bars"></i></div>
                   <div class="chat-cancel-batch-btn" style="display:none; cursor: pointer; padding: 5px; color: #007aff; font-size: 16px; font-weight: 500;">取消</div>`;
            } else {
                groupRightAvatarHtml = `<div class="chat-call-btn" style="cursor: pointer; padding: 5px; font-size: 18px;"><i class="fas fa-phone-alt"></i></div>
                   <div class="chat-menu-btn" style="cursor: pointer; padding: 5px; font-size: 18px;"><i class="fas fa-bars"></i></div>
                   <div class="chat-cancel-batch-btn" style="display:none; cursor: pointer; padding: 5px; color: #007aff; font-size: 16px; font-weight: 500;">取消</div>`;
            }

            const backBtnHtml = friend.type === 'group'
                ? `<div class="chat-back-btn" style="cursor: pointer; width: 36px; height: 36px; background: rgba(242, 242, 247, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; justify-content: center; align-items: center; pointer-events: auto;">
                        <i class="fas fa-chevron-left" style="pointer-events: none; margin-right: 2px;"></i>
                   </div>`
                : `<div class="chat-back-btn" style="cursor: pointer; padding: 5px 0 5px 0; width: 24px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-chevron-left" style="pointer-events: none;"></i></div>`;

            let topBarHtml = '';
            if (friend.type === 'group') {
                topBarHtml = `
                    <div class="chat-top-bar" style="${headerStyle}">
                        ${backBtnHtml}
                        <div style="display: flex; align-items: center; justify-content: center; flex: 1; pointer-events: none;" class="ins-chat-header" id="active-chat-header">
                            ${titleHtml}
                        </div>
                        <div id="active-chat-right-avatar-container">
                            ${groupRightAvatarHtml}
                        </div>
                    </div>
                `;
            } else {
                topBarHtml = `
                    <div class="chat-top-bar" style="${headerStyle}; padding-left: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                            ${backBtnHtml}
                            <div style="display: flex; align-items: center; justify-content: flex-start; flex: 1; cursor: pointer; pointer-events: auto;" class="ins-chat-header">
                                ${titleHtml}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${groupRightAvatarHtml}
                        </div>
                    </div>
                `;
            }

            page.innerHTML = `
                <div class="chat-sticky-container" style="${friend.type === 'group' ? 'background: transparent; padding-bottom: 5px; pointer-events: none;' : 'background-color: #ffffff; border-bottom: 1px solid #f2f2f7; padding-bottom: 5px;'}">
                    ${topBarHtml}
                </div>
                <div class="ins-chat-messages"></div>
                <div class="ins-chat-input-container">
                    <div class="reply-preview-container" style="display:none; padding: 10px 14px; background: #f2f2f7; border-radius: 18px; margin-bottom: 10px; font-size: 13px; color: #8e8e93; position: relative; margin-left: 10px; margin-right: 10px; max-width: fit-content; border: 1px solid #e5e5ea; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div class="reply-preview-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 24px; color: #333; max-width: 250px;"></div>
                        <div class="reply-cancel-btn" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; border-radius: 50%; background: #ccc; color: #fff; display: flex; justify-content: center; align-items: center; cursor: pointer; font-size: 10px;"><i class="fas fa-times"></i></div>
                    </div>
                    <div class="ins-chat-input-wrapper">
                        <div class="ins-input-icon plus-btn"><i class="fas fa-plus"></i></div>
                        <input type="text" placeholder="发送消息..." class="ins-message-input chat-input">
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <div class="send-btn-icon send-btn"><i class="fas fa-paper-plane"></i></div>
                            <div class="send-btn-icon mic-btn"><i class="fas fa-microphone"></i></div>
                        </div>
                    </div>
                    <div class="chat-batch-action-bar" style="display:none; justify-content: space-between; align-items: center; padding: 15px 40px; padding-bottom: 15px; background: rgba(242, 242, 247, 0.95); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-top: 1px solid rgba(0,0,0,0.1); position: absolute; bottom: 0; left: 0; width: 100%; z-index: 100; box-sizing: border-box;">
                        <i class="fas fa-share batch-forward-btn" style="font-size: 22px; color: #8e8e93; cursor: pointer;"></i>
                        <i class="far fa-star batch-star-btn" style="font-size: 22px; color: #8e8e93; cursor: pointer;"></i>
                        <i class="far fa-trash-alt batch-delete-btn" style="font-size: 22px; color: #ff3b30; cursor: pointer;"></i>
                    </div>
                </div>
                <div class="pay-transfer-detail-overlay" style="display:none; position:absolute; inset:0; z-index:1200; background:rgba(0,0,0,0.28); align-items:center; justify-content:center; padding:20px; box-sizing:border-box;">
                    <div class="pay-transfer-detail-card" style="width:100%; max-width:320px; border-radius:28px; background:rgba(255,255,255,0.96); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); box-shadow:0 18px 45px rgba(0,0,0,0.18); padding:20px 18px 16px; box-sizing:border-box;">
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                            <div class="pay-transfer-detail-avatar" style="width:52px; height:52px; border-radius:50%; overflow:hidden; background:#e5e5ea; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                <i class="fas fa-user" style="color:#8e8e93; font-size:20px;"></i>
                            </div>
                            <div style="min-width:0;">
                                <div class="pay-transfer-detail-name" style="font-size:17px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">付款人</div>
                                <div style="font-size:12px; color:#8e8e93; margin-top:3px;">向你转账</div>
                            </div>
                        </div>
                        <div class="pay-transfer-detail-amount" style="font-size:34px; line-height:1.1; font-weight:800; color:#111; text-align:center; margin:8px 0 10px;">¥0.00</div>
                        <div class="pay-transfer-detail-desc" style="font-size:14px; color:#666; text-align:center; line-height:1.5; min-height:21px; margin-bottom:18px;">转账说明</div>
                        <div style="border-radius:18px; background:#f7f7fa; padding:12px 14px; margin-bottom:16px;">
                            <div style="font-size:12px; color:#8e8e93; margin-bottom:6px;">转账详情</div>
                            <div class="pay-transfer-detail-summary" style="font-size:14px; color:#222; line-height:1.5;">付款人向你转账</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button type="button" class="pay-transfer-detail-reject-btn" style="flex:1; height:46px; border:none; border-radius:16px; background:#f2f2f7; color:#666; font-size:16px; font-weight:600; cursor:pointer;">退回</button>
                            <button type="button" class="pay-transfer-detail-claim-btn" style="flex:1; height:46px; border:none; border-radius:16px; background:#111; color:#fff; font-size:16px; font-weight:700; cursor:pointer;">收下</button>
                        </div>
                    </div>
                </div>
            `;

            if(chatsContent) chatsContent.appendChild(page);

            const backBtn = page.querySelector('.chat-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    if (profilePanelOverlay) {
                        const latestFriend = window.imApp.getFriendById(friend) || friend;
                        window.imChat.hideProfilePanel(latestFriend, profilePanelOverlay);
                    }
                    window.imData.currentActiveFriend = null;
                    window.imChat.updateChatsView();
                });
            }

            const cancelBatchBtn = page.querySelector('.chat-cancel-batch-btn');
            const menuBtn = page.querySelector('.chat-menu-btn');
            const callBtn = page.querySelector('.chat-call-btn');
            const batchActionBar = page.querySelector('.chat-batch-action-bar');
            const inputWrapper = page.querySelector('.ins-chat-input-wrapper');
            const batchDeleteBtn = page.querySelector('.batch-delete-btn');
            const transferDetailOverlay = page.querySelector('.pay-transfer-detail-overlay');
            const transferDetailAvatar = page.querySelector('.pay-transfer-detail-avatar');
            const transferDetailName = page.querySelector('.pay-transfer-detail-name');
            const transferDetailAmount = page.querySelector('.pay-transfer-detail-amount');
            const transferDetailDesc = page.querySelector('.pay-transfer-detail-desc');
            const transferDetailSummary = page.querySelector('.pay-transfer-detail-summary');
            const transferDetailRejectBtn = page.querySelector('.pay-transfer-detail-reject-btn');
            const transferDetailClaimBtn = page.querySelector('.pay-transfer-detail-claim-btn');
            let pendingTransferMsg = null;

            function exitBatchSelectMode() {
                window.imData.batchSelectMode = false;
                if (cancelBatchBtn) cancelBatchBtn.style.display = 'none';
                if (menuBtn) menuBtn.style.display = 'block';
                if (callBtn) callBtn.style.display = 'block';
                if (batchActionBar) batchActionBar.style.display = 'none';
                if (inputWrapper) inputWrapper.style.display = 'flex';

                const checkboxes = page.querySelectorAll('.chat-checkbox-wrapper');
                checkboxes.forEach(cb => {
                    cb.style.display = 'none';
                    const icon = cb.querySelector('i');
                    if (icon) {
                        icon.className = 'far fa-circle';
                        icon.style.color = '#c7c7cc';
                    }
                });
            }

            function closeTransferDetailOverlay() {
                pendingTransferMsg = null;
                if (transferDetailOverlay) transferDetailOverlay.style.display = 'none';
            }

            function openTransferDetailOverlay(targetMsg) {
                if (!transferDetailOverlay || !targetMsg) return;

                pendingTransferMsg = targetMsg;
                const senderName = friend.nickname || friend.realName || '对方';
                const amount = Number(targetMsg.amount) || 0;
                const description = targetMsg.description || '转账';

                if (transferDetailName) transferDetailName.textContent = senderName;
                if (transferDetailAmount) transferDetailAmount.textContent = `¥${amount.toFixed(2)}`;
                if (transferDetailDesc) transferDetailDesc.textContent = description;
                if (transferDetailSummary) transferDetailSummary.textContent = `${senderName} 向你转账，备注：${description}`;

                if (transferDetailAvatar) {
                    if (friend.avatarUrl) {
                        transferDetailAvatar.innerHTML = `<img src="${friend.avatarUrl}" style="width:100%; height:100%; object-fit:cover; display:block;">`;
                    } else {
                        transferDetailAvatar.innerHTML = `<i class="fas fa-user" style="color:#8e8e93; font-size:20px;"></i>`;
                    }
                }

                transferDetailOverlay.style.display = 'flex';
            }

            page._openTransferDetailOverlay = openTransferDetailOverlay;
            page._closeTransferDetailOverlay = closeTransferDetailOverlay;
            window.imChat.ensureRedPacketDetailOverlayForExistingPage(page, friend);

            if (callBtn) {
                callBtn.addEventListener('click', () => {
                    let callOverlay = document.getElementById('custom-call-overlay');
                    if (!callOverlay) {
                        callOverlay = document.createElement('div');
                        callOverlay.id = 'custom-call-overlay';
                        callOverlay.style.position = 'fixed';
                        callOverlay.style.inset = '0';
                        callOverlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
                        callOverlay.style.zIndex = '10000';
                        callOverlay.style.display = 'flex';
                        callOverlay.style.alignItems = 'flex-end';
                        callOverlay.style.justifyContent = 'center';
                        
                        const sheet = document.createElement('div');
                        sheet.style.width = '100%';
                        sheet.style.backgroundColor = 'transparent';
                        sheet.style.padding = '10px';
                        sheet.style.boxSizing = 'border-box';
                        sheet.style.paddingBottom = 'max(10px, env(safe-area-inset-bottom))';
                        
                        const menuGroup = document.createElement('div');
                        menuGroup.style.backgroundColor = '#fff';
                        menuGroup.style.borderRadius = '14px';
                        menuGroup.style.overflow = 'hidden';
                        
                        const videoBtn = document.createElement('div');
                        videoBtn.innerText = '视频通话';
                        videoBtn.style.padding = '18px 0';
                        videoBtn.style.textAlign = 'center';
                        videoBtn.style.fontSize = '20px';
                        videoBtn.style.color = '#007aff';
                        videoBtn.style.borderBottom = '1px solid #e5e5ea';
                        videoBtn.style.cursor = 'pointer';
                        videoBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            callOverlay.style.display = 'none';
                            if(window.showToast) window.showToast('视频通话功能开发中...');
                        });
                        
                        const voiceBtn = document.createElement('div');
                        voiceBtn.innerText = '语音通话';
                        voiceBtn.style.padding = '18px 0';
                        voiceBtn.style.textAlign = 'center';
                        voiceBtn.style.fontSize = '20px';
                        voiceBtn.style.color = '#007aff';
                        voiceBtn.style.cursor = 'pointer';
                        voiceBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            callOverlay.style.display = 'none';
                            if (window.imChat && window.imChat.openVoiceCall) {
                                window.imChat.openVoiceCall(friend);
                            } else {
                                if(window.showToast) window.showToast('语音通话准备中...');
                            }
                        });
                        
                        menuGroup.appendChild(videoBtn);
                        menuGroup.appendChild(voiceBtn);
                        sheet.appendChild(menuGroup);
                        callOverlay.appendChild(sheet);
                        
                        document.body.appendChild(callOverlay);
                        
                        callOverlay.addEventListener('click', (e) => {
                            if (e.target === callOverlay) {
                                callOverlay.style.display = 'none';
                            }
                        });
                    }
                    callOverlay.style.display = 'flex';
                });
            }

            if (cancelBatchBtn) {
                cancelBatchBtn.addEventListener('click', () => {
                    exitBatchSelectMode();
                });
            }

            if (batchDeleteBtn) {
                batchDeleteBtn.addEventListener('click', () => {
                    const selectedIcons = page.querySelectorAll('.chat-checkbox-wrapper i.fa-check-circle');
                    const selected = Array.from(selectedIcons).map(icon => icon.getAttribute('data-timestamp'));
                    if (selected.length === 0) {
                        if(window.showToast) window.showToast('请选择要删除的消息');
                        return;
                    }
                    if (window.showCustomModal) {
                        window.showCustomModal({
                            title: '删除消息',
                            message: `确定要删除选中的 ${selected.length} 条消息吗？`,
                            confirmText: '删除',
                            cancelText: '取消',
                            onConfirm: async () => {
                                const saved = window.imApp.removeFriendMessages
                                    ? await window.imApp.removeFriendMessages(
                                        friend.id,
                                        selected.map((timestamp) => ({ timestamp })),
                                        { silent: true }
                                    )
                                    : (window.imApp.commitFriendChange
                                        ? await window.imApp.commitFriendChange(friend.id, (targetFriend) => {
                                            if (!targetFriend || !Array.isArray(targetFriend.messages)) return;
                                            targetFriend.messages = targetFriend.messages.filter((m) => !selected.includes(String(m.timestamp)));
                                        }, { silent: true })
                                        : false);

                                if (!saved) {
                                    if (window.showToast) window.showToast('删除失败，消息已恢复');
                                    const failedContainer = page.querySelector('.ins-chat-messages');
                                    if (failedContainer) {
                                        failedContainer.innerHTML = '';
                                        window.imChat.renderChatHistory(friend, failedContainer);
                                        window.imChat.scrollToBottom(failedContainer);
                                    }
                                    return;
                                }

                                const container = page.querySelector('.ins-chat-messages');
                                if(container) {
                                    container.innerHTML = '';
                                    window.imChat.renderChatHistory(friend, container);
                                    window.imChat.scrollToBottom(container);
                                }
                                exitBatchSelectMode();
                            }
                        });
                    }
                });
            }

            const msgContainerProxy = page.querySelector('.ins-chat-messages');
            if (msgContainerProxy) {
                msgContainerProxy.addEventListener('click', (e) => {
                    const row = e.target.closest('.chat-row');

                    if (window.imData.batchSelectMode) {
                        e.stopPropagation();
                        e.preventDefault();
                        if (row) {
                            const icon = row.querySelector('.chat-checkbox-wrapper i');
                            if (icon) {
                                if (icon.classList.contains('fa-circle')) {
                                    icon.className = 'fas fa-check-circle';
                                    icon.style.color = '#393939';
                                } else {
                                    icon.className = 'far fa-circle';
                                    icon.style.color = '#c7c7cc';
                                }
                            }
                        }
                        return;
                    }

                    if (!row) return;

                    const messageId = row.getAttribute('data-message-id');
                    const ts = row.getAttribute('data-timestamp');
                    if ((!messageId && !ts) || !friend.messages) return;

                    const msg = friend.messages.find(item => {
                        if (messageId && String(item.id) === String(messageId)) return true;
                        return String(item.timestamp) === String(ts);
                    });
                    if (!msg || msg.type !== 'pay_transfer' || msg.payKind !== 'char_to_user_pending') return;

                    const bubble = e.target.closest('.chat-bubble.pay-transfer-bubble, .pay-transfer-card');
                    if (!bubble) return;

                    e.preventDefault();
                    e.stopPropagation();
                    openTransferDetailOverlay(msg);
                }, true);
            }

            if (transferDetailOverlay) {
                transferDetailOverlay.addEventListener('click', (e) => {
                    if (e.target === transferDetailOverlay) {
                        closeTransferDetailOverlay();
                    }
                });
            }

            if (transferDetailRejectBtn) {
                transferDetailRejectBtn.addEventListener('click', () => {
                    const targetMsg = pendingTransferMsg;
                    closeTransferDetailOverlay();
                    if (targetMsg) {
                        if (window.imChat.rejectIncomingTransfer) {
                            window.imChat.rejectIncomingTransfer(friend, targetMsg);
                        }
                    }
                });
            }

            if (transferDetailClaimBtn) {
                transferDetailClaimBtn.addEventListener('click', () => {
                    const targetMsg = pendingTransferMsg;
                    closeTransferDetailOverlay();
                    if (targetMsg) {
                        window.imChat.claimIncomingTransfer(friend, targetMsg);
                    }
                });
            }

            const replyCancelBtn = page.querySelector('.reply-cancel-btn');
            if (replyCancelBtn) {
                replyCancelBtn.addEventListener('click', () => {
                    window.imData.currentReplyText = null;
                    const preview = page.querySelector('.reply-preview-container');
                    if(preview) preview.style.display = 'none';
                });
            }

            let profilePanelOverlay = page.querySelector('.chat-profile-panel-overlay');
            if (!profilePanelOverlay) {
                profilePanelOverlay = document.createElement('div');
                profilePanelOverlay.className = 'chat-profile-panel-overlay';
                profilePanelOverlay.style.display = 'none';

                page.appendChild(profilePanelOverlay);

                profilePanelOverlay.addEventListener('click', (e) => {
                    if (e.target === profilePanelOverlay) {
                        const latestFriend = window.imApp.getFriendById(friend) || friend;
                        window.imChat.hideProfilePanel(latestFriend, profilePanelOverlay);
                    }
                });
            }

            const avatarContainer = page.querySelector('.ins-chat-avatar');
            const singleChatHeader = page.querySelector('.ins-chat-header');

            function handleSingleChatProfileTrigger(e) {
                if (friend.type === 'official' || friend.type === 'group') return;
                e.stopPropagation();
                const latestFriend = window.imApp.getFriendById(friend) || friend;
                window.imChat.toggleProfilePanel(latestFriend, profilePanelOverlay);
            }

            if (avatarContainer) {
                if (friend.type === 'official') {
                    avatarContainer.style.cursor = 'default';
                } else {
                    avatarContainer.style.cursor = 'pointer';
                    avatarContainer.addEventListener('click', handleSingleChatProfileTrigger);
                }
            }

            if (singleChatHeader && friend.type !== 'group') {
                if (friend.type === 'official') {
                    singleChatHeader.style.cursor = 'default';
                } else {
                    singleChatHeader.style.cursor = 'pointer';
                    singleChatHeader.addEventListener('click', handleSingleChatProfileTrigger);
                }
            }

            page.addEventListener('click', (e) => {
                if (
                    profilePanelOverlay &&
                    profilePanelOverlay.classList.contains('active') &&
                    !e.target.closest('.chat-profile-panel-card') &&
                    !e.target.closest('.ins-chat-avatar') &&
                    !e.target.closest('.ins-chat-header')
                ) {
                    const latestFriend = window.imApp.getFriendById(friend) || friend;
                    window.imChat.hideProfilePanel(latestFriend, profilePanelOverlay);
                }
            });

            if (friend.type === 'group') {
                const rightAvatar = page.querySelector('.group-header-right-avatar');
                if (rightAvatar) {
                    rightAvatar.addEventListener('click', () => {
                        if (window.imApp.openGroupDetails) {
                            window.imApp.openGroupDetails(friend);
                        }
                    });
                }
                const header = page.querySelector('.ins-chat-header');
                if (header) {
                    header.addEventListener('click', () => {
                        if (window.imApp.openGroupDetails) {
                            window.imApp.openGroupDetails(friend);
                        }
                    });
                }

                // Event delegation for clicking on member avatars in group chat to show profile card
                const messagesArea = page.querySelector('.ins-chat-messages');
                if (messagesArea) {
                    messagesArea.addEventListener('click', (e) => {
                        const avatarSlot = e.target.closest('.group-ai-avatar-slot');
                        if (avatarSlot) {
                            const row = avatarSlot.closest('.ai-row');
                            if (row) {
                                const speakerName = row.getAttribute('data-speaker');
                                const thought = row.getAttribute('data-thought');
                                if (speakerName) {
                                    const members = window.imChat.getGroupMemberFriends(friend);
                                    const speakerInfo = members.find(m => m.nickname === speakerName);
                                    if (speakerInfo && window.imChat.showGroupMemberProfileCard) {
                                        window.imChat.showGroupMemberProfileCard(speakerInfo, page, avatarSlot, friend, thought);
                                    }
                                }
                            }
                        }
                    });
                }
            }
            
            // Re-bind menuBtn properly for chat settings (whether single or group if needed, but per request it's mainly single chat setting missing)
            if (menuBtn && friend.type !== 'group') {
                menuBtn.addEventListener('click', () => {
                    if (friend.type === 'official') {
                        const officialSettingsSheet = document.getElementById('official-chat-settings-sheet');
                        if (officialSettingsSheet) {
                            if (window.openView) {
                                window.openView(officialSettingsSheet);
                            } else {
                                officialSettingsSheet.style.display = 'flex';
                                setTimeout(() => {
                                    officialSettingsSheet.style.opacity = '1';
                                    const bottomSheet = officialSettingsSheet.querySelector('.bottom-sheet');
                                    if(bottomSheet) bottomSheet.style.transform = 'translateY(0)';
                                }, 10);
                            }
                            
                            // add empty click listener so clicking outside closes it
                            officialSettingsSheet.onclick = (e) => {
                                if (e.target === officialSettingsSheet) {
                                    if (window.closeView) window.closeView(officialSettingsSheet);
                                    else officialSettingsSheet.style.display = 'none';
                                }
                            };
                        }
                        return;
                    }

                    const chatSettingsSheet = document.getElementById('chat-settings-sheet');
                    if (chatSettingsSheet) {
                        const settingsAvatarImg = document.getElementById('chat-settings-avatar-img');
                        const settingsAvatarIcon = document.getElementById('chat-settings-avatar-icon');
                        const settingsName = document.getElementById('chat-settings-name');
                        
                        if (friend.avatarUrl) {
                            if(settingsAvatarImg) { settingsAvatarImg.src = friend.avatarUrl; settingsAvatarImg.style.display = 'block'; }
                            if(settingsAvatarIcon) settingsAvatarIcon.style.display = 'none';
                        } else {
                            if(settingsAvatarImg) { settingsAvatarImg.style.display = 'none'; settingsAvatarImg.src = ''; }
                            if(settingsAvatarIcon) settingsAvatarIcon.style.display = 'block';
                        }
                        if (settingsName) settingsName.textContent = friend.nickname;

                        if (window.openView) {
                            window.openView(chatSettingsSheet);
                        } else {
                            chatSettingsSheet.style.display = 'flex';
                            setTimeout(() => {
                                chatSettingsSheet.style.opacity = '1';
                                const bottomSheet = chatSettingsSheet.querySelector('.bottom-sheet');
                                if(bottomSheet) bottomSheet.style.transform = 'translateY(0)';
                            }, 10);
                        }
                        
                        if(window.imApp.initChatSettingsForFriend) window.imApp.initChatSettingsForFriend(friend);
                    }
                });
            }

            const input = page.querySelector('.chat-input');
            const sendBtn = page.querySelector('.send-btn');
            const micBtn = page.querySelector('.mic-btn');
            const plusBtn = page.querySelector('.plus-btn');
            const msgContainer = page.querySelector('.ins-chat-messages');

            if (plusBtn) {
                plusBtn.addEventListener('click', () => {
                    if (window.imChat.openAttachmentSheet) {
                        window.imChat.openAttachmentSheet();
                    }
                });
            }

            // @ mention logic variables
            let mentionList = null;
            let currentMentionQuery = '';
            let mentionStartIndex = -1;

            function renderMentionList(query, inputEl) {
                if (friend.type !== 'group' || !friend.members) return;
                
                const listContainer = page.querySelector('.at-mention-list');
                if (!listContainer) return;

                const members = window.imChat.getGroupMemberFriends(friend);
                const allOptions = [
                    { id: 'all', nickname: '全体成员', isAll: true },
                    ...members
                ];

                const filtered = allOptions.filter(m => 
                    m.isAll || (m.nickname && m.nickname.toLowerCase().includes(query.toLowerCase()))
                );

                if (filtered.length === 0) {
                    listContainer.style.display = 'none';
                    return;
                }

                listContainer.innerHTML = '';
                filtered.forEach(m => {
                    const item = document.createElement('div');
                    item.className = 'at-mention-item';
                    
                    let avatarHtml = '';
                    if (m.isAll) {
                        avatarHtml = `<i class="fas fa-users" style="color: #007aff;"></i>`;
                    } else if (m.avatarUrl) {
                        avatarHtml = `<img src="${m.avatarUrl}">`;
                    } else {
                        avatarHtml = `<i class="fas fa-user"></i>`;
                    }

                    item.innerHTML = `
                        <div class="at-mention-avatar">${avatarHtml}</div>
                        <div class="at-mention-name">${m.isAll ? m.nickname : m.nickname}</div>
                    `;

                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const text = inputEl.value;
                        const before = text.substring(0, mentionStartIndex);
                        const after = text.substring(inputEl.selectionStart);
                        const mentionText = m.isAll ? '@全体成员 ' : `@${m.nickname} `;
                        
                        inputEl.value = before + mentionText + after;
                        const newCursorPos = before.length + mentionText.length;
                        inputEl.setSelectionRange(newCursorPos, newCursorPos);
                        inputEl.focus();
                        
                        listContainer.style.display = 'none';
                        mentionStartIndex = -1;
                        currentMentionQuery = '';
                    });

                    listContainer.appendChild(item);
                });

                listContainer.style.display = 'flex';
            }

            input.addEventListener('input', (e) => {
                if (friend.type !== 'group') return;
                
                const text = input.value;
                const cursorPos = input.selectionStart;
                
                // Search backwards for the @ symbol
                let foundAt = -1;
                for (let i = cursorPos - 1; i >= 0; i--) {
                    if (text[i] === '@') {
                        foundAt = i;
                        break;
                    }
                    if (text[i] === ' ' || text[i] === '\n') {
                        break; // Stop if we hit a space before @
                    }
                }

                if (foundAt !== -1) {
                    mentionStartIndex = foundAt;
                    currentMentionQuery = text.substring(foundAt + 1, cursorPos);
                    
                    let listContainer = page.querySelector('.at-mention-list');
                    if (!listContainer) {
                        listContainer = document.createElement('div');
                        listContainer.className = 'at-mention-list';
                        const inputWrapper = page.querySelector('.ins-chat-input-wrapper');
                        inputWrapper.parentNode.insertBefore(listContainer, inputWrapper);
                    }
                    
                    renderMentionList(currentMentionQuery, input);
                } else {
                    mentionStartIndex = -1;
                    currentMentionQuery = '';
                    const listContainer = page.querySelector('.at-mention-list');
                    if (listContainer) listContainer.style.display = 'none';
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    window.imChat.handleSend(friend, input, msgContainer);
                    const listContainer = page.querySelector('.at-mention-list');
                    if (listContainer) listContainer.style.display = 'none';
                }
            });

            sendBtn.addEventListener('click', () => {
                window.imChat.handleSend(friend, input, msgContainer);
                const listContainer = page.querySelector('.at-mention-list');
                if (listContainer) listContainer.style.display = 'none';
            });

            micBtn.addEventListener('click', () => {
                window.imChat.handleAiReply(friend, msgContainer, micBtn);
            });

            window.imChat.renderChatHistory(friend, msgContainer);
        } else {
             window.imChat.ensureTransferDetailOverlayForExistingPage(page, friend);
             window.imChat.ensureRedPacketDetailOverlayForExistingPage(page, friend);
             const msgContainer = page.querySelector('.ins-chat-messages');
             window.imChat.renderChatHistory(friend, msgContainer);
        }

        if(window.imApp.applyFriendBg) window.imApp.applyFriendBg(friend);
        if(window.imApp.initTimestampSetting) window.imApp.initTimestampSetting(friend);
        
        if(page) {
            if(friend.showTimestamp) page.classList.add('show-timestamps');
            else page.classList.remove('show-timestamps');
            
            if(friend.isPinned) page.classList.add('pinned-chat');
            else page.classList.remove('pinned-chat');
            
            // Re-apply status bar css
            if(window.imApp.applyFriendStatusBarCss) window.imApp.applyFriendStatusBarCss(friend);
        }

        if (navChatsBtn) {
            if (navChatsBtn.classList.contains('active')) window.imChat.updateChatsView();
            else navChatsBtn.click();
        }
    }

function showContextMenu(row, e) {
        const msgContextOverlay = document.getElementById('msg-context-overlay');
        const msgContextMenu = document.getElementById('msg-context-menu');
        
        if (!msgContextOverlay || !msgContextMenu) return;
        
        if (navigator.vibrate) navigator.vibrate(50);
        
        window.imData.currentActiveRow = row;
        row.classList.add('message-active');
        
        const bubble = row.querySelector('.chat-bubble');
        if (!bubble) return;
        
        const screenEl = document.getElementById('app') || document.body;
        const screenRect = screenEl.getBoundingClientRect();
        
        // Clone bubble into context menu
        const bubbleClone = document.getElementById('msg-context-bubble-clone');
        if (bubbleClone) {
            bubbleClone.innerHTML = '';
            const clonedBubble = bubble.cloneNode(true);
            clonedBubble.style.margin = '0';
            clonedBubble.style.maxWidth = '100%';
            bubbleClone.appendChild(clonedBubble);
        }
        
        // Reset more actions
        const moreActions = document.getElementById('msg-context-more-actions');
        const mainActions = document.getElementById('msg-context-actions');
        if (moreActions) moreActions.style.display = 'none';
        if (mainActions) mainActions.style.display = 'flex';
        
        // Determine alignment based on user/ai row
        const isUserRow = row.classList.contains('user-row');
        
        msgContextOverlay.style.display = 'flex';
        msgContextOverlay.style.opacity = '1';
        
        // Position the menu centered or aligned
        const menuWidth = Math.min(screenRect.width - 32, 300);
        msgContextMenu.style.width = menuWidth + 'px';
        
        if (isUserRow) {
            msgContextMenu.style.alignItems = 'flex-end';
            msgContextMenu.style.right = '16px';
            msgContextMenu.style.left = 'auto';
        } else {
            msgContextMenu.style.alignItems = 'flex-start';
            msgContextMenu.style.left = '16px';
            msgContextMenu.style.right = 'auto';
        }
        
        // Vertical centering: place bubble roughly at its original position
        const bubbleRect = bubble.getBoundingClientRect();
        const bubbleCenterY = bubbleRect.top + bubbleRect.height / 2 - screenRect.top;
        
        // Estimate menu total height (reaction bar ~50 + bubble + actions ~200)
        const estimatedMenuHeight = 50 + bubbleRect.height + 220;
        let topOffset = bubbleCenterY - estimatedMenuHeight / 2;
        
        // Clamp to screen bounds
        if (topOffset < 60) topOffset = 60;
        if (topOffset + estimatedMenuHeight > screenRect.height - 20) {
            topOffset = screenRect.height - estimatedMenuHeight - 20;
        }
        if (topOffset < 60) topOffset = 60;
        
        msgContextMenu.style.top = topOffset + 'px';
        
        msgContextMenu.style.transformOrigin = isUserRow ? 'top right' : 'top left';
        
        requestAnimationFrame(() => {
            msgContextMenu.style.opacity = '1';
            msgContextMenu.style.transform = 'scale(1)';
        });
    }

function closeContextMenu() {
        const msgContextOverlay = document.getElementById('msg-context-overlay');
        const msgContextMenu = document.getElementById('msg-context-menu');
        
        if (!msgContextOverlay || !msgContextMenu) return;
        msgContextMenu.style.opacity = '0';
        msgContextMenu.style.transform = 'scale(0.85)';
        
        if (window.imData.currentActiveRow) {
            window.imData.currentActiveRow.classList.remove('message-active');
            window.imData.currentActiveRow = null;
        }
        
        setTimeout(() => {
            msgContextOverlay.style.display = 'none';
            // Clean up cloned bubble
            const bubbleClone = document.getElementById('msg-context-bubble-clone');
            if (bubbleClone) bubbleClone.innerHTML = '';
        }, 250);
    }

    function showGroupMemberProfileCard(speakerInfo, page, anchorElement, group, historicalThought = null) {
        if (!page) return;
        let overlay = document.getElementById('global-gmp-overlay');
        if (!overlay) {
            // Mount overlay to body so it covers everything and isn't clipped
            overlay = document.createElement('div');
            overlay.id = 'global-gmp-overlay';
            overlay.className = 'group-member-profile-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
            overlay.style.zIndex = '9999';
            overlay.style.display = 'none';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';

            const card = document.createElement('div');
            card.className = 'group-member-profile-card';
            
            overlay.appendChild(card);
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.opacity = '0';
                    card.classList.remove('active');
                    setTimeout(() => overlay.style.display = 'none', 300);
                }
            });
        }

        const card = overlay.querySelector('.group-member-profile-card');
        const avatarUrl = speakerInfo.avatarUrl || 'https://picsum.photos/seed/char/100/100';
        const name = speakerInfo.nickname || 'Unknown';
        const signature = speakerInfo.signature || '这个人很懒，什么都没写';
        const title = speakerInfo.groupTitle || '';
        
        let groupProfile = {};
        if (group && group.memberProfiles && group.memberProfiles[speakerInfo.id]) {
            groupProfile = group.memberProfiles[speakerInfo.id];
        }
        
        const thought = historicalThought || (historicalThought === null ? '暂无心声' : (groupProfile.thought || '暂无心声'));
        
        // For group members, we check if they have individual sleeping schedules if we can retrieve them
        let isSleeping = false;
        const members = window.imChat.getGroupMemberFriends(group);
        const actualMember = members.find(m => String(m.id) === String(speakerInfo.id));
        if (actualMember) {
            isSleeping = window.imApp.isCharacterSleeping(actualMember);
        }
        
        const status = isSleeping ? 'offline' : (groupProfile.status || 'online');
        const statusColor = isSleeping ? '#8e8e93' : '#34c759';

        let titleHtml = title ? `<div class="gmp-title">${title}</div>` : '';

        card.innerHTML = `
            <div class="gmp-header">
                <div class="gmp-avatar-wrapper">
                    <div class="gmp-avatar"><img src="${avatarUrl}"></div>
                    <div class="gmp-status-bubble" contenteditable="${isSleeping ? 'false' : 'true'}" spellcheck="false">${status}</div>
                </div>
            </div>
            <div class="gmp-body">
                <div class="gmp-name-row">
                    <div class="gmp-name">${name}</div>
                    ${titleHtml}
                </div>
                <div class="gmp-signature">${signature}</div>
                <div class="gmp-inner-voice">${thought}</div>
            </div>
        `;

        const statusBubble = card.querySelector('.gmp-status-bubble');
        statusBubble.addEventListener('blur', async (e) => {
            const nextStatus = e.target.innerText.trim() || 'online';
            if (group) {
                const saved = window.imApp.commitFriendChange
                    ? await window.imApp.commitFriendChange(group.id, (targetGroup) => {
                        if (!targetGroup) return;
                        if (!targetGroup.memberProfiles) targetGroup.memberProfiles = {};
                        if (!targetGroup.memberProfiles[speakerInfo.id]) {
                            targetGroup.memberProfiles[speakerInfo.id] = { thought: '暂无心声', status: 'online' };
                        }
                        targetGroup.memberProfiles[speakerInfo.id].status = nextStatus;
                    }, { silent: true })
                    : false;

                if (!saved) {
                    e.target.innerText = status;
                    if (window.showToast) window.showToast('状态保存失败');
                    return;
                }
            } else {
                // Fallback if no group context
                e.target.innerText = status;
            }
        });

        // Step 1: Explicitly set display flex to make it part of the render tree
        overlay.style.display = 'block';
        card.style.display = 'flex'; // CRITICAL FIX: Make the card itself visible

        // Calculate position based on anchor element
        if (anchorElement) {
            const rect = anchorElement.getBoundingClientRect();
            const cardWidth = 300;
            const cardHeight = card.offsetHeight || 380; // approximate if 0

            let top = rect.bottom + 10;
            let left = rect.left;

            // Adjust if it goes off screen
            const viewportWidth = Math.max(
                0,
                window.visualViewport?.width ||
                document.documentElement.clientWidth ||
                window.innerWidth ||
                0
            );
            const viewportHeight = Math.max(
                0,
                window.visualViewport?.height ||
                document.documentElement.clientHeight ||
                window.innerHeight ||
                0
            );

            if (left + cardWidth > viewportWidth - 20) {
                left = viewportWidth - cardWidth - 20;
            }
            if (top + cardHeight > viewportHeight - 20) {
                top = rect.top - cardHeight - 10;
            }

            const originY = (top < rect.top) ? 'bottom' : 'top';
            const originX = (left === rect.left) ? 'left' : 'right';
            
            card.style.top = top + 'px';
            card.style.left = left + 'px';
            card.style.transformOrigin = `${originX} ${originY}`;
        } else {
            card.style.top = '50%';
            card.style.left = '50%';
            card.style.transform = 'translate(-50%, -50%) scale(0.85)';
            card.style.transformOrigin = 'center center';
        }

        // Step 2: Force reflow so browser registers the new display state BEFORE animating
        void overlay.offsetHeight;
        void card.offsetHeight;
        
        // Step 3: Trigger the transition
        overlay.style.opacity = '1';
        card.classList.add('active');
        
        // Cleanup translation for anchor if needed after scale animation is triggered
        if (anchorElement) {
            card.style.transform = 'scale(1)';
        }
    }

    window.imChat.openChatTab = openChatTab;
    window.imChat.showContextMenu = showContextMenu;
    window.imChat.closeContextMenu = closeContextMenu;
    window.imChat.showGroupMemberProfileCard = showGroupMemberProfileCard;

});
