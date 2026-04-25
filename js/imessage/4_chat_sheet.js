

// ==========================================
// IMESSAGE: 4_chat_sheet.js
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const { apiConfig, userState } = window;
    window.imChat = window.imChat || {};
    const imChat = window.imChat;

async function commitSheetFriendChange(friendOrId, mutator, options = {}) {
        if (!window.imApp.commitFriendChange) return false;
        const targetId = typeof friendOrId === 'object' && friendOrId !== null ? friendOrId.id : friendOrId;

        return window.imApp.commitFriendChange(targetId, (targetFriend) => {
            if (!targetFriend) return;
            if (window.imData.currentActiveFriend && String(window.imData.currentActiveFriend.id) === String(targetFriend.id)) {
                window.imData.currentActiveFriend = targetFriend;
            }
            return mutator(targetFriend);
        }, options);
    }

function createAttachmentSheet(page) {
        if (window.imData.attachmentSheet) {
            // Ensure it's appended to the correct page if switching chats
            if (window.imData.attachmentSheet.parentNode !== page) {
                page.appendChild(window.imData.attachmentSheet);
            }
            return window.imData.attachmentSheet;
        }
        
        const attachmentSheet = document.createElement('div');
        attachmentSheet.id = 'chat-attachment-sheet';
        window.imData.attachmentSheet = attachmentSheet;
        attachmentSheet.style.position = 'absolute';
        attachmentSheet.style.inset = '0';
        attachmentSheet.style.zIndex = '1000';
        attachmentSheet.style.display = 'none';
        attachmentSheet.style.flexDirection = 'column';
        attachmentSheet.style.justifyContent = 'flex-end';
        attachmentSheet.style.overflow = 'hidden';
        
        const fakeImages = Array.from({length: 21}, (_, i) => `https://picsum.photos/seed/gall${i}/300/300`);
        let fakeHtml = '';
        fakeImages.forEach(src => {
            fakeHtml += `
                <div class="grid-item fake-img" data-src="${src}" style="aspect-ratio: 1; background: url(${src}) center/cover; position: relative; cursor: pointer;">
                     <div style="position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border: 1.5px solid #fff; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                </div>
            `;
        });

        attachmentSheet.innerHTML = `
            <div class="sheet-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.3s;"></div>
            <div class="sheet-content" style="position: relative; height: 50%; width: 100%; background: #fff; border-radius: 24px 24px 0 0; display: flex; flex-direction: column; overflow: hidden; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1); box-shadow: 0 -5px 15px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); z-index: 10;">
                    <div class="close-sheet-btn" style="width: 32px; height: 32px; background: #f2f2f7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; color: #000;"><i class="fas fa-times"></i></div>
                    <div style="font-weight: 600; font-size: 18px; color: #000;">Recents <i class="fas fa-chevron-down" style="font-size: 12px; color: #8e8e93; margin-left: 4px;"></i></div>
                    <div style="width: 32px;"></div>
                </div>
                
                <!-- Views Container -->
                <div style="flex: 1; position: relative; overflow: hidden; background: #fff;">
                    <!-- Gallery View -->
                    <div class="sheet-view view-gallery" style="position: absolute; inset: 0; overflow-y: auto; padding: 2px; padding-bottom: 120px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; align-content: flex-start; scrollbar-width: none;">
                        <div class="grid-item virtual-upload" style="aspect-ratio: 1; background: #f2f2f7; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
                            <i class="fas fa-magic" style="font-size: 28px; color: #007aff; margin-bottom: 8px;"></i>
                            <span style="font-size: 12px; color: #8e8e93; font-weight: 500;">虚拟照片</span>
                        </div>
                        <div class="grid-item real-upload" style="aspect-ratio: 1; background: #f2f2f7; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; position: relative;">
                            <i class="fas fa-camera" style="font-size: 28px; color: #34c759; margin-bottom: 8px;"></i>
                            <span style="font-size: 12px; color: #8e8e93; font-weight: 500;">真实相册</span>
                            <input type="file" accept="image/*" class="real-file-input" style="position: absolute; inset: 0; opacity: 0; cursor: pointer;">
                        </div>
                        ${fakeHtml}
                    </div>

                    <!-- File View Placeholder -->
                    <div class="sheet-view view-file" style="position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; background: #fff; padding-bottom: 60px;">
                        <i class="fas fa-folder-open" style="font-size: 64px; color: #c7c7cc; margin-bottom: 16px;"></i>
                        <div style="font-size: 16px; color: #8e8e93; font-weight: 500;">File Manager</div>
                        <div style="font-size: 13px; color: #aeaeb2; margin-top: 4px;">Coming soon</div>
                    </div>

                    <!-- Location View Placeholder -->
                    <div class="sheet-view view-location" style="position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; background: #fff; padding-bottom: 60px;">
                        <i class="fas fa-map-marked-alt" style="font-size: 64px; color: #c7c7cc; margin-bottom: 16px;"></i>
                        <div style="font-size: 16px; color: #8e8e93; font-weight: 500;">Location Picker</div>
                        <div style="font-size: 13px; color: #aeaeb2; margin-top: 4px;">Coming soon</div>
                    </div>

                    <!-- Poll View Placeholder -->
                    <div class="sheet-view view-poll" style="position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; background: #fff; padding-bottom: 60px;">
                        <i class="fas fa-chart-pie" style="font-size: 64px; color: #c7c7cc; margin-bottom: 16px;"></i>
                        <div style="font-size: 16px; color: #8e8e93; font-weight: 500;">Create a Poll</div>
                        <div style="font-size: 13px; color: #aeaeb2; margin-top: 4px;">Coming soon</div>
                    </div>

                    <!-- More View -->
                    <div class="sheet-view view-more" style="position: absolute; inset: 0; display: none; flex-direction: column; align-items: flex-start; justify-content: flex-start; background: #fff; padding: 20px 18px 120px; gap: 14px;">
                        <div class="attachment-more-icon-grid">
                            <div class="attachment-more-pay-entry">
                                <div class="attachment-more-pay-icon">
                                    <i class="fas fa-wallet"></i>
                                </div>
                                <div class="attachment-more-pay-label">Pay</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom Tabs (Floating Pill, Left Aligned, Tap to Select) -->
                <div class="sheet-tabs-container" style="position: absolute; bottom: 16px; left: 20px; right: 20px; border-radius: 40px; display: flex; padding: 10px 16px; overflow-x: auto; background: rgba(250, 250, 250, 0.75); backdrop-filter: blur(35px); -webkit-backdrop-filter: blur(35px); box-shadow: 0 4px 20px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.8); scrollbar-width: none; gap: 24px; align-items: center; justify-content: flex-start;">
                    <style>
                        #chat-attachment-sheet ::-webkit-scrollbar { display: none; }

                        .attachment-more-pay-entry {
                            cursor: pointer;
                            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s;
                        }
                        .attachment-more-pay-entry:active {
                            transform: scale(0.85);
                            opacity: 0.7;
                        }

                        .sheet-tab-item {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 3px;
                            min-width: 44px;
                            cursor: pointer;
                            transition: transform 0.2s, opacity 0.2s;
                            flex-shrink: 0;
                        }
                        .sheet-tab-icon {
                            font-size: 24px;
                            color: #8e8e93;
                            transition: color 0.2s, transform 0.2s;
                        }
                        .sheet-tab-text {
                            font-size: 10px;
                            color: #8e8e93;
                            font-weight: 500;
                            transition: color 0.2s;
                        }
                        .sheet-tab-item.active .sheet-tab-icon {
                            color: #007aff;
                            transform: scale(1.1);
                        }
                        .sheet-tab-item.active .sheet-tab-text {
                            color: #007aff;
                            font-weight: 600;
                        }
                    </style>
                    
                    <div class="sheet-tab-item active" data-tab="gallery">
                        <i class="fas fa-image sheet-tab-icon"></i>
                        <span class="sheet-tab-text">Gallery</span>
                    </div>
                    <div class="sheet-tab-item" data-tab="file">
                        <i class="fas fa-file-alt sheet-tab-icon"></i>
                        <span class="sheet-tab-text">File</span>
                    </div>
                    <div class="sheet-tab-item" data-tab="location">
                        <i class="fas fa-map-marker-alt sheet-tab-icon"></i>
                        <span class="sheet-tab-text">Location</span>
                    </div>
                    <div class="sheet-tab-item" data-tab="poll">
                        <i class="fas fa-chart-bar sheet-tab-icon"></i>
                        <span class="sheet-tab-text">Poll</span>
                    </div>
                    <div class="sheet-tab-item" data-tab="more">
                        <i class="fas fa-ellipsis-h sheet-tab-icon"></i>
                        <span class="sheet-tab-text">More</span>
                    </div>
                </div>
            </div>
            
            <!-- Pay Transfer Overlay moved to attachmentSheet root so it floats centrally and isn't cropped -->
            <div class="pay-transfer-form-overlay" style="position: absolute; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.18); z-index: 20; padding: 20px;">
                <div class="pay-transfer-form-card" style="width: 100%; max-width: 348px; border-radius: 30px; background: rgba(255,255,255,0.98); box-shadow: 0 18px 45px rgba(0,0,0,0.16); padding: 18px 16px 16px; box-sizing: border-box; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);">
                    <div class="pay-transfer-form-title" style="font-size: 18px; font-weight: 800; color: #111; text-align: center; margin-bottom: 10px;">Pay</div>
                    <div class="pay-transfer-mode-tabs" style="display: flex; justify-content: center; gap: 22px; margin-bottom: 14px; border-bottom: 1px solid rgba(0,0,0,0.08);">
                        <button type="button" class="pay-mode-tab active" data-pay-mode="transfer" style="position: relative; border: none; background: none; color: #000; font-size: 15px; font-weight: 600; padding: 0 2px 10px; cursor: pointer;">转账</button>
                        <button type="button" class="pay-mode-tab" data-pay-mode="red_packet" style="position: relative; border: none; background: none; color: #8e8e93; font-size: 15px; font-weight: 600; padding: 0 2px 10px; cursor: pointer;">红包</button>
                    </div>

                    <div class="pay-mode-panel pay-mode-panel-transfer" style="display: block;">
                        <div class="pay-form-field" style="margin-bottom: 10px;">
                            <div style="font-size: 12px; color: #8e8e93; margin-bottom: 6px;">金额</div>
                            <input type="number" class="pay-transfer-amount-input" placeholder="金额，例如 88.88" min="0" step="0.01" style="width: 100%; height: 42px; border: none; border-radius: 16px; background: #f7f7fa; padding: 0 14px; box-sizing: border-box; font-size: 14px; color: #111;">
                        </div>
                        <div class="pay-form-field" style="margin-bottom: 10px;">
                            <div style="font-size: 12px; color: #8e8e93; margin-bottom: 6px;">描述</div>
                            <input type="text" class="pay-transfer-desc-input" placeholder="描述，例如 奶茶钱 / 晚餐AA" style="width: 100%; height: 42px; border: none; border-radius: 16px; background: #f7f7fa; padding: 0 14px; box-sizing: border-box; font-size: 14px; color: #111;">
                        </div>
                        <div class="pay-form-field pay-group-recipient-field" style="display: none; margin-bottom: 6px; position: relative;">
                            <div style="font-size: 12px; color: #8e8e93; margin-bottom: 8px;">转账给谁</div>
                            <button type="button" class="pay-group-recipient-trigger" style="width: 100%; height: 48px; border: none; border-radius: 16px; background: #f7f7fa; padding: 0 14px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                                <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                                    <div class="pay-group-recipient-avatar" style="width: 28px; height: 28px; border-radius: 50%; overflow: hidden; background: #e5e5ea; color: #8e8e93; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px;">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div class="pay-group-recipient-label" style="font-size: 14px; color: #111; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">请选择群成员</div>
                                </div>
                                <i class="fas fa-chevron-down pay-group-recipient-arrow" style="font-size: 12px; color: #8e8e93;"></i>
                            </button>
                            <div class="pay-group-recipient-dropdown" style="display: none; margin-top: 8px; border-radius: 18px; background: #fff; box-shadow: 0 10px 24px rgba(0,0,0,0.1); padding: 8px; max-height: 220px; overflow-y: auto;"></div>
                        </div>
                    </div>

                    <div class="pay-mode-panel pay-mode-panel-red-packet" style="display: none;">
                        <div class="pay-form-field" style="margin-bottom: 10px;">
                            <div style="font-size: 12px; color: #8e8e93; margin-bottom: 6px;">红包个数</div>
                            <input type="number" class="pay-red-packet-count-input" placeholder="例如 3" min="1" step="1" style="width: 100%; height: 42px; border: none; border-radius: 16px; background: #f7f7fa; padding: 0 14px; box-sizing: border-box; font-size: 14px; color: #111;">
                        </div>
                        <div class="pay-form-field" style="margin-bottom: 10px;">
                            <div style="font-size: 12px; color: #8e8e93; margin-bottom: 6px;">总金额</div>
                            <input type="number" class="pay-red-packet-amount-input" placeholder="总金额，例如 88.88" min="0" step="0.01" style="width: 100%; height: 42px; border: none; border-radius: 16px; background: #f7f7fa; padding: 0 14px; box-sizing: border-box; font-size: 14px; color: #111;">
                        </div>
                        <div class="pay-form-field" style="margin-bottom: 6px;">
                            <div style="font-size: 12px; color: #8e8e93; margin-bottom: 6px;">描述</div>
                            <input type="text" class="pay-red-packet-desc-input" placeholder="描述，例如 恭喜发财 / 今晚奶茶" style="width: 100%; height: 42px; border: none; border-radius: 16px; background: #f7f7fa; padding: 0 14px; box-sizing: border-box; font-size: 14px; color: #111;">
                        </div>
                    </div>

                    <div class="pay-transfer-form-actions" style="display: flex; gap: 10px; margin-top: 16px;">
                        <div class="pay-transfer-cancel-btn" style="flex: 1; height: 44px; border-radius: 16px; background: #f2f2f7; color: #666; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; cursor: pointer;">取消</div>
                        <div class="pay-transfer-submit-btn" style="flex: 1; height: 44px; border-radius: 16px; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; cursor: pointer;">发送</div>
                    </div>
                </div>
            </div>
        `;
        page.appendChild(attachmentSheet);

        const overlay = attachmentSheet.querySelector('.sheet-overlay');
        const content = attachmentSheet.querySelector('.sheet-content');
        const closeBtn = attachmentSheet.querySelector('.close-sheet-btn');
        const tabsContainer = attachmentSheet.querySelector('.sheet-tabs-container');
        const tabItems = attachmentSheet.querySelectorAll('.sheet-tab-item');
        const payEntry = attachmentSheet.querySelector('.attachment-more-pay-entry');
        const payFormOverlay = attachmentSheet.querySelector('.pay-transfer-form-overlay');
        const payAmountInput = attachmentSheet.querySelector('.pay-transfer-amount-input');
        const payDescInput = attachmentSheet.querySelector('.pay-transfer-desc-input');
        const payCancelBtn = attachmentSheet.querySelector('.pay-transfer-cancel-btn');
        const paySubmitBtn = attachmentSheet.querySelector('.pay-transfer-submit-btn');
        const payModeTabs = attachmentSheet.querySelectorAll('.pay-mode-tab');
        const payTransferPanel = attachmentSheet.querySelector('.pay-mode-panel-transfer');
        const payRedPacketPanel = attachmentSheet.querySelector('.pay-mode-panel-red-packet');
        const payRecipientField = attachmentSheet.querySelector('.pay-group-recipient-field');
        const payRecipientTrigger = attachmentSheet.querySelector('.pay-group-recipient-trigger');
        const payRecipientAvatar = attachmentSheet.querySelector('.pay-group-recipient-avatar');
        const payRecipientLabel = attachmentSheet.querySelector('.pay-group-recipient-label');
        const payRecipientArrow = attachmentSheet.querySelector('.pay-group-recipient-arrow');
        const payRecipientDropdown = attachmentSheet.querySelector('.pay-group-recipient-dropdown');
        const payRedPacketCountInput = attachmentSheet.querySelector('.pay-red-packet-count-input');
        const payRedPacketAmountInput = attachmentSheet.querySelector('.pay-red-packet-amount-input');
        const payRedPacketDescInput = attachmentSheet.querySelector('.pay-red-packet-desc-input');

        const sheetViews = attachmentSheet.querySelectorAll('.sheet-view');
        let currentPayMode = 'transfer';
        let selectedRecipientId = null;

        // Click listener to set active tab and ensure it is fully visible in the container
        tabItems.forEach(item => {
            item.addEventListener('click', () => {
                // 1. Update active tab UI
                tabItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // 2. Scroll into view if partially hidden
                const containerRect = tabsContainer.getBoundingClientRect();
                const itemRect = item.getBoundingClientRect();
                
                if (itemRect.left < containerRect.left) {
                    tabsContainer.scrollBy({ left: itemRect.left - containerRect.left - 16, behavior: 'smooth' });
                } else if (itemRect.right > containerRect.right) {
                    tabsContainer.scrollBy({ left: itemRect.right - containerRect.right + 16, behavior: 'smooth' });
                }

                // 3. Switch View Panels
                const targetTab = item.getAttribute('data-tab');
                sheetViews.forEach(view => {
                    if (view.classList.contains(`view-${targetTab}`)) {
                        if (targetTab === 'gallery') {
                            view.style.display = 'grid';
                        } else {
                            view.style.display = 'flex';
                        }
                    } else {
                        view.style.display = 'none';
                    }
                });
            });
        });

        const setRecipientTriggerDisplay = (member) => {
            if (payRecipientLabel) {
                payRecipientLabel.textContent = member
                    ? (member.nickname || member.realName || '群成员')
                    : '请选择群成员';
            }

            if (payRecipientAvatar) {
                if (member && member.avatarUrl) {
                    payRecipientAvatar.innerHTML = `<img src="${member.avatarUrl}" style="width:100%; height:100%; object-fit:cover; display:block;">`;
                } else if (member) {
                    payRecipientAvatar.innerHTML = `<span>${String(member.nickname || member.realName || '群').charAt(0)}</span>`;
                } else {
                    payRecipientAvatar.innerHTML = `<i class="fas fa-user"></i>`;
                }
            }
        };

        const setRecipientDropdownOpen = (isOpen) => {
            if (payRecipientDropdown) payRecipientDropdown.style.display = isOpen ? 'block' : 'none';
            if (payRecipientArrow) {
                payRecipientArrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        };

        const renderGroupRecipientOptions = (activeFriend) => {
            if (!payRecipientDropdown) return;

            payRecipientDropdown.innerHTML = '';
            selectedRecipientId = null;
            setRecipientTriggerDisplay(null);
            setRecipientDropdownOpen(false);

            if (!activeFriend || activeFriend.type !== 'group') return;

            const recipients = window.imChat.getAvailableGroupRecipients(activeFriend);
            recipients.forEach(member => {
                const option = document.createElement('button');
                option.type = 'button';
                option.className = 'pay-group-recipient-option';
                option.setAttribute('data-member-id', member.id);
                option.style.width = '100%';
                option.style.border = 'none';
                option.style.borderRadius = '14px';
                option.style.background = 'transparent';
                option.style.padding = '10px 10px';
                option.style.display = 'flex';
                option.style.alignItems = 'center';
                option.style.justifyContent = 'space-between';
                option.style.cursor = 'pointer';

                option.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                        <div style="width:30px; height:30px; border-radius:50%; overflow:hidden; background:#e5e5ea; color:#8e8e93; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:12px;">
                            ${member.avatarUrl
                                ? `<img src="${member.avatarUrl}" style="width:100%; height:100%; object-fit:cover; display:block;">`
                                : `<span>${String(member.nickname || member.realName || '群').charAt(0)}</span>`}
                        </div>
                        <div style="font-size:14px; color:#111; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${member.nickname || member.realName || '群成员'}</div>
                    </div>
                    <i class="fas fa-check" style="font-size:12px; color:transparent;"></i>
                `;

                option.addEventListener('click', () => {
                    selectedRecipientId = member.id;
                    setRecipientTriggerDisplay(member);
                    payRecipientDropdown.querySelectorAll('.pay-group-recipient-option').forEach(item => {
                        item.style.background = 'transparent';
                        const icon = item.querySelector('.fa-check');
                        if (icon) icon.style.color = 'transparent';
                    });
                    option.style.background = '#f7f7fa';
                    const icon = option.querySelector('.fa-check');
                    if (icon) icon.style.color = '#111';
                    setRecipientDropdownOpen(false);
                });

                payRecipientDropdown.appendChild(option);
            });

            if (recipients.length > 0) {
                const firstOption = payRecipientDropdown.querySelector('.pay-group-recipient-option');
                if (firstOption) firstOption.click();
            }
        };

        const syncPayModeUi = (activeFriend, nextMode = 'transfer') => {
            currentPayMode = nextMode === 'red_packet' ? 'red_packet' : 'transfer';

            payModeTabs.forEach(tab => {
                const isActive = tab.getAttribute('data-pay-mode') === currentPayMode;
                tab.classList.toggle('active', isActive);
                tab.style.color = isActive ? '#000' : '#8e8e93';
                tab.style.fontWeight = isActive ? '700' : '600';
                tab.style.boxShadow = 'none';
                tab.style.background = 'none';
                tab.style.borderRadius = '0';
                tab.style.setProperty('--tab-line-opacity', isActive ? '1' : '0');
                if (isActive) {
                    tab.style.borderBottom = '2px solid #111';
                } else {
                    tab.style.borderBottom = '2px solid transparent';
                }
            });

            if (payTransferPanel) payTransferPanel.style.display = currentPayMode === 'transfer' ? 'block' : 'none';
            if (payRedPacketPanel) payRedPacketPanel.style.display = currentPayMode === 'red_packet' ? 'block' : 'none';

            const isGroupChat = activeFriend && activeFriend.type === 'group';
            if (payRecipientField) {
                payRecipientField.style.display = isGroupChat && currentPayMode === 'transfer' ? 'block' : 'none';
            }
        };

        const closePayTransferForm = () => {
            if (!payFormOverlay) return;
            payFormOverlay.style.display = 'none';
            if (payAmountInput) payAmountInput.value = '';
            if (payDescInput) payDescInput.value = '';
            if (payRedPacketCountInput) payRedPacketCountInput.value = '';
            if (payRedPacketAmountInput) payRedPacketAmountInput.value = '';
            if (payRedPacketDescInput) payRedPacketDescInput.value = '';
            selectedRecipientId = null;
            if (payRecipientDropdown) payRecipientDropdown.innerHTML = '';
            setRecipientTriggerDisplay(null);
            setRecipientDropdownOpen(false);
            currentPayMode = 'transfer';
        };

        const openPayTransferForm = () => {
            if (!payFormOverlay) return;
            const activeFriend = window.imData.currentActiveFriend;
            const isGroupChat = activeFriend && activeFriend.type === 'group';

            payFormOverlay.style.display = 'flex';
            if (payAmountInput) payAmountInput.value = '';
            if (payDescInput) payDescInput.value = '';
            if (payRedPacketCountInput) payRedPacketCountInput.value = '';
            if (payRedPacketAmountInput) payRedPacketAmountInput.value = '';
            if (payRedPacketDescInput) payRedPacketDescInput.value = '';

            if (payModeTabs.length > 0) {
                payModeTabs.forEach(tab => {
                    tab.style.display = isGroupChat ? 'inline-flex' : 'none';
                });
            }

            renderGroupRecipientOptions(activeFriend);
            syncPayModeUi(activeFriend, 'transfer');

            setTimeout(() => {
                if (payAmountInput) payAmountInput.focus();
            }, 30);
        };

        const closeSheet = () => {
            closePayTransferForm();
            overlay.style.opacity = '0';
            content.style.transform = 'translateY(100%)';
            setTimeout(() => {
                attachmentSheet.style.display = 'none';
            }, 300);
        };

        const submitPayTransfer = async () => {
            const activeFriend = window.imData.currentActiveFriend;
            if (!activeFriend) {
                if (window.showToast) window.showToast('当前聊天不存在');
                return;
            }

            const isGroupChat = activeFriend.type === 'group';
            const activePageId = `chat-interface-${activeFriend.id}`;
            const activePage = document.getElementById(activePageId);
            const activeContainer = activePage ? activePage.querySelector('.ins-chat-messages') : null;
            const now = Date.now();
            const lastMsg = activeFriend.messages && activeFriend.messages.length > 0
                ? activeFriend.messages[activeFriend.messages.length - 1]
                : null;

            if (currentPayMode === 'red_packet' && isGroupChat) {
                const packetCount = parseInt(payRedPacketCountInput ? payRedPacketCountInput.value : '', 10);
                const totalAmount = Number(payRedPacketAmountInput ? payRedPacketAmountInput.value : '');
                const description = String(payRedPacketDescInput ? payRedPacketDescInput.value : '').trim() || '恭喜发财';

                if (!Number.isInteger(packetCount) || packetCount <= 0) {
                    if (window.showToast) window.showToast('红包个数无效');
                    return;
                }

                if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
                    if (window.showToast) window.showToast('总金额无效');
                    return;
                }

                const allocations = window.imChat.createRedPacketAllocations(totalAmount, packetCount);
                if (allocations.length !== packetCount) {
                    if (window.showToast) window.showToast('红包金额需至少满足每包 0.01');
                    return;
                }

                const balance = typeof window.getPayBalance === 'function' ? window.getPayBalance() : 0;
                if (totalAmount > balance) {
                    if (window.showToast) window.showToast('余额不足');
                    return;
                }

                const success = typeof window.addPayTransaction === 'function'
                    ? window.addPayTransaction(totalAmount, `${description} · 群红包`, 'expense')
                    : false;

                if (!success) {
                    if (window.showToast) window.showToast('红包发送失败');
                    return;
                }

                const packetMsg = window.imChat.normalizeGroupRedPacketState({
                    id: window.imChat.createMessageId('packet'),
                    packetId: window.imChat.createMessageId('packet'),
                    role: 'user',
                    type: 'group_red_packet',
                    totalAmount,
                    packetCount,
                    description,
                    allocations,
                    claimRecords: [],
                    claimedMemberIds: [],
                    content: `[群红包] ${description} ¥${Number(totalAmount).toFixed(2)}`,
                    timestamp: now
                }, activeFriend);

                const saved = window.imApp.appendFriendMessage
                    ? await window.imApp.appendFriendMessage(activeFriend.id, packetMsg, { silent: true })
                    : await commitSheetFriendChange(activeFriend, (targetFriend) => {
                        if (!targetFriend.messages) targetFriend.messages = [];
                        targetFriend.messages.push(packetMsg);
                    }, { silent: true });

                if (!saved) {
                    if (window.showToast) window.showToast('红包记录保存失败');
                    return;
                }

                closeSheet();

                if (activeContainer) {
                    const appended = window.imChat.appendMessageToContainer
                        ? window.imChat.appendMessageToContainer(activeFriend, activeContainer, packetMsg, { scroll: true })
                        : false;
                    if (!appended && window.imChat.rerenderChatContainer) {
                        window.imChat.rerenderChatContainer(activeFriend, activeContainer, { scroll: true });
                    }
                }
                return;
            }

            const amount = Number(payAmountInput ? payAmountInput.value : '');
            const description = String(payDescInput ? payDescInput.value : '').trim() || '转账';

            if (!Number.isFinite(amount) || amount <= 0) {
                if (window.showToast) window.showToast('金额无效');
                return;
            }

            const balance = typeof window.getPayBalance === 'function' ? window.getPayBalance() : 0;
            if (amount > balance) {
                if (window.showToast) window.showToast('余额不足');
                return;
            }

            let targetName = activeFriend.type === 'group'
                ? (activeFriend.nickname || '群聊')
                : (activeFriend.nickname || activeFriend.realName || '对方');

            if (isGroupChat) {
                const selectedMember = window.imChat.getAvailableGroupRecipients(activeFriend).find(member => String(member.id) === String(selectedRecipientId));
                if (!selectedMember) {
                    if (window.showToast) window.showToast('请选择群成员');
                    return;
                }
                targetName = selectedMember.nickname || selectedMember.realName || '群成员';
            }

            const success = typeof window.addPayTransaction === 'function'
                ? window.addPayTransaction(amount, `${description} · ${targetName}`, 'expense')
                : false;

            if (!success) {
                if (window.showToast) window.showToast('转账失败');
                return;
            }

            const payMsg = {
                id: window.imChat.createMessageId('pay'),
                role: 'user',
                type: 'pay_transfer',
                payKind: 'user_to_char',
                amount,
                description,
                targetName,
                targetMemberId: isGroupChat ? selectedRecipientId : null,
                cardTitle: isGroupChat ? '群转账' : 'Pay 转账',
                payStatus: 'completed',
                content: `[用户转账] ${description} ¥${amount.toFixed(2)}`,
                timestamp: now
            };

            const saved = window.imApp.appendFriendMessage
                ? await window.imApp.appendFriendMessage(activeFriend.id, payMsg, { silent: true })
                : await commitSheetFriendChange(activeFriend, (targetFriend) => {
                    if (!targetFriend.messages) targetFriend.messages = [];
                    targetFriend.messages.push(payMsg);
                }, { silent: true });

            if (!saved) {
                if (window.showToast) window.showToast('转账记录保存失败');
                return;
            }

            closeSheet();

            if (activeContainer) {
                const appended = window.imChat.appendMessageToContainer
                    ? window.imChat.appendMessageToContainer(activeFriend, activeContainer, payMsg, { scroll: true })
                    : false;
                if (!appended && window.imChat.rerenderChatContainer) {
                    window.imChat.rerenderChatContainer(activeFriend, activeContainer, { scroll: true });
                }
            }
        };

        overlay.addEventListener('click', closeSheet);
        closeBtn.addEventListener('click', closeSheet);

        if (payEntry) {
            payEntry.addEventListener('click', () => {
                openPayTransferForm();
            });
        }

        if (payRecipientTrigger) {
            payRecipientTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const activeFriend = window.imData.currentActiveFriend;
                if (!activeFriend || activeFriend.type !== 'group') return;
                const hasOptions = payRecipientDropdown && payRecipientDropdown.children.length > 0;
                if (!hasOptions) return;
                const isOpen = payRecipientDropdown && payRecipientDropdown.style.display === 'block';
                setRecipientDropdownOpen(!isOpen);
            });
        }

        if (payModeTabs.length > 0) {
            payModeTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const activeFriend = window.imData.currentActiveFriend;
                    const nextMode = tab.getAttribute('data-pay-mode') || 'transfer';
                    setRecipientDropdownOpen(false);
                    syncPayModeUi(activeFriend, nextMode);
                    setTimeout(() => {
                        if (nextMode === 'red_packet') {
                            if (payRedPacketCountInput) payRedPacketCountInput.focus();
                        } else if (payAmountInput) {
                            payAmountInput.focus();
                        }
                    }, 20);
                });
            });
        }

        if (payFormOverlay) {
            payFormOverlay.addEventListener('click', (e) => {
                if (e.target === payFormOverlay) {
                    closePayTransferForm();
                    return;
                }

                if (
                    payRecipientDropdown &&
                    payRecipientDropdown.style.display === 'block' &&
                    !e.target.closest('.pay-group-recipient-field')
                ) {
                    setRecipientDropdownOpen(false);
                }
            });
        }

        if (payCancelBtn) {
            payCancelBtn.addEventListener('click', () => {
                closePayTransferForm();
            });
        }

        if (paySubmitBtn) {
            paySubmitBtn.addEventListener('click', async () => {
                await submitPayTransfer();
            });
        }

        if (payAmountInput) {
            payAmountInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitPayTransfer();
                }
            });
        }

        if (payDescInput) {
            payDescInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitPayTransfer();
                }
            });
        }

        // Upload Virtual Photo
        const virtualUpload = attachmentSheet.querySelector('.virtual-upload');
        virtualUpload.addEventListener('click', () => {
            closeSheet();
            if (window.showCustomModal) {
                window.showCustomModal({
                    type: 'prompt',
                    title: '发送虚拟照片',
                    placeholder: '描述这张照片的内容(供AI理解)',
                    confirmText: '发送',
                    onConfirm: (desc) => {
                        if (desc && desc.trim()) {
                            window.imChat.sendImageMessage(
                                `https://picsum.photos/seed/${Math.random()}/300/400`, 
                                desc.trim()
                            );
                        }
                    }
                });
            }
        });

        // Upload Real Photo
        const realFileInput = attachmentSheet.querySelector('.real-file-input');
        realFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                closeSheet();
                try {
                    const imageUrl = window.imApp.compressImageFile
                        ? await window.imApp.compressImageFile(file, {
                            maxWidth: 1600,
                            maxHeight: 1600,
                            mimeType: 'image/jpeg',
                            quality: 0.82
                        })
                        : await window.imApp.readFileAsDataUrl(file);

                    window.imChat.sendImageMessage(imageUrl, file.name);
                } catch (error) {
                    console.error('Failed to process uploaded chat image', error);
                    if (window.showToast) window.showToast('图片处理失败');
                }
            }
            e.target.value = '';
        });

        // Fake photos click
        const fakeImgs = attachmentSheet.querySelectorAll('.fake-img');
        fakeImgs.forEach(img => {
            img.addEventListener('click', () => {
                const src = img.getAttribute('data-src');
                closeSheet();
                window.imChat.sendImageMessage(src, '一张相册里的照片');
            });
        });

        return attachmentSheet;
    }

async function sendImageMessage(imgUrl, description) {
        if (!window.imData.currentActiveFriend) return;
        const friend = window.imData.currentActiveFriend;
        const pageId = `chat-interface-${friend.id}`;
        const page = document.getElementById(pageId);
        if (!page) return;
        const container = page.querySelector('.ins-chat-messages');

        const now = Date.now();
        const msgObj = {
            id: window.imChat.createMessageId('img'),
            role: 'user',
            type: 'image',
            content: imgUrl,
            text: description,
            timestamp: now
        };

        const saved = window.imApp.appendFriendMessage
            ? await window.imApp.appendFriendMessage(friend.id, msgObj, { silent: true })
            : await commitSheetFriendChange(friend, (targetFriend) => {
                if (!targetFriend.messages) targetFriend.messages = [];
                targetFriend.messages.push(msgObj);
            }, { silent: true });

        if (!saved) {
            if (window.showToast) window.showToast('图片消息保存失败');
            return;
        }

        if (container) {
            const appended = window.imChat.appendMessageToContainer
                ? window.imChat.appendMessageToContainer(friend, container, msgObj, { scroll: true })
                : false;
            if (!appended && window.imChat.rerenderChatContainer) {
                window.imChat.rerenderChatContainer(friend, container, { scroll: true });
            }
        }
    }

function openAttachmentSheet() {
        if (!window.imData.currentActiveFriend) return;
        const pageId = `chat-interface-${window.imData.currentActiveFriend.id}`;
        const page = document.getElementById(pageId);
        if (!page) return;

        // Reset the sheet instance entirely just in case DOM was manipulated or destroyed
        const sheet = window.imChat.createAttachmentSheet(page);
        sheet.style.display = 'flex';
        // force reflow
        sheet.offsetHeight;
        const overlay = sheet.querySelector('.sheet-overlay');
        const content = sheet.querySelector('.sheet-content');
        if (overlay) overlay.style.opacity = '1';
        if (content) content.style.transform = 'translateY(0)';
    }

    let notificationBanner = null;
    let bannerTimeout = null;
    let notificationQueue = [];
    let isShowingNotification = false;

    function processNotificationQueue() {
        if (isShowingNotification || notificationQueue.length === 0) return;

        isShowingNotification = true;
        const { friend, messageText } = notificationQueue.shift();

        const appContainer = document.querySelector('.app-container') || document.body;

        if (!notificationBanner) {
            notificationBanner = document.createElement('div');
            notificationBanner.id = 'ios-banner-notification';
            // Styling exactly like the uploaded image capsule, constrained to appContainer
            notificationBanner.style.position = 'absolute';
            notificationBanner.style.top = '10px'; // Starts slightly below top
            notificationBanner.style.left = '50%';
            notificationBanner.style.transform = 'translate(-50%, -150%)'; // Hidden initially
            notificationBanner.style.width = 'calc(100% - 32px)';
            notificationBanner.style.maxWidth = '360px'; // Keep it tight like a mobile banner
            notificationBanner.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            notificationBanner.style.backdropFilter = 'blur(20px)';
            notificationBanner.style.webkitBackdropFilter = 'blur(20px)';
            notificationBanner.style.borderRadius = '40px'; // Deep capsule pill shape
            notificationBanner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,1)';
            notificationBanner.style.display = 'flex';
            notificationBanner.style.alignItems = 'center';
            notificationBanner.style.padding = '8px 16px 8px 8px'; // Asymmetric padding to match image (avatar left)
            notificationBanner.style.zIndex = '9999';
            notificationBanner.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2)';
            notificationBanner.style.cursor = 'pointer';

            appContainer.appendChild(notificationBanner);

            // Global click handler to jump to chat
            notificationBanner.addEventListener('click', () => {
                window.imChat.hideBannerNotification(true);
                if (window.imApp && window.imApp.openChatTab && notificationBanner.currentFriend) {
                    window.imApp.openChatTab(notificationBanner.currentFriend);
                }
            });
        }

        notificationBanner.currentFriend = friend;

        const avatar = friend.avatarUrl || 'https://picsum.photos/seed/char/100/100';
        const name = friend.nickname || friend.realName || 'Unknown';
        
        // Remove markdown or code blocks from preview
        let previewText = messageText.replace(/<[^>]*>?/gm, '').trim();
        if (previewText.length > 30) previewText = previewText.substring(0, 30) + '...';

        // Get current time
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        notificationBanner.innerHTML = `
            <img src="${avatar}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            <div style="flex: 1; min-width: 0; margin-left: 14px; display: flex; flex-direction: column; justify-content: center;">
                <div style="font-weight: 700; font-size: 15px; color: #1c1c1e; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
                <div style="font-size: 13px; color: #8e8e93; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${previewText}</div>
            </div>
            <div style="font-size: 12px; color: #8e8e93; font-weight: 500; margin-left: 10px; flex-shrink: 0;">
                ${timeStr}
            </div>
        `;

        if (bannerTimeout) clearTimeout(bannerTimeout);

        // Slide down
        requestAnimationFrame(() => {
            notificationBanner.style.transform = 'translate(-50%, max(env(safe-area-inset-top), 10px))';
        });

        // Slide up after 4 seconds
        bannerTimeout = setTimeout(() => {
            hideBannerInternal();
        }, 4000);
    }

    function hideBannerInternal() {
        if (notificationBanner) {
            notificationBanner.style.transform = 'translate(-50%, -150%)';
        }
        setTimeout(() => {
            isShowingNotification = false;
            processNotificationQueue();
        }, 400); // Wait for transition to finish
    }

    function showBannerNotification(friend, messageText) {
        notificationQueue.push({ friend, messageText });
        processNotificationQueue();
    }

    function hideBannerNotification(clearQueue = false) {
        if (clearQueue) {
            notificationQueue = [];
        }
        if (bannerTimeout) {
            clearTimeout(bannerTimeout);
        }
        hideBannerInternal();
    }

    window.imChat.createAttachmentSheet = createAttachmentSheet;
    window.imChat.sendImageMessage = sendImageMessage;
    window.imChat.openAttachmentSheet = openAttachmentSheet;
    window.imChat.showBannerNotification = showBannerNotification;
    window.imChat.hideBannerNotification = hideBannerNotification;

});
