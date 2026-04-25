document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let currentCardId = 'bank_1'; // 默认选中第一张卡
    let currentFilter = 'all'; // 'all', 'income', 'expense'
    
    let cards = [
        {
            id: 'bank_1',
            type: 'bank',
            name: '招商银行',
            icon: 'fas fa-university',
            cardType: '储蓄卡',
            number: '**** **** **** 8888',
            balance: 1000.00,
            logo: '银联',
            styleClass: '', // Default white card
            transactions: []
        },
        {
            id: 'bank_2',
            type: 'bank',
            name: 'VISA 信用卡',
            icon: 'fas fa-globe',
            cardType: 'Credit',
            number: '**** **** **** 1234',
            balance: 50000.00,
            logo: 'VISA',
            styleClass: 'bank-card-blue',
            transactions: []
        }
    ];

    function getPayStoreSnapshot() {
        const raw = typeof window.getAppState === 'function' ? window.getAppState('pay') : null;
        return raw && typeof raw === 'object' ? raw : {};
    }

    function applyPaySnapshot(data = {}) {
        // Migrate old data if necessary, or load saved cards
        if (data.cards && Array.isArray(data.cards)) {
            cards = data.cards;
            if (data.currentCardId) {
                currentCardId = data.currentCardId;
            }
        } else {
            // Migration from old version
            if (data.transactions || data.balance !== undefined) {
                cards[0].transactions = Array.isArray(data.transactions) ? data.transactions : [];
                const nextBalance = parseFloat(data.balance);
                cards[0].balance = Number.isFinite(nextBalance) ? nextBalance : 1000.00;
            }
        }
        
        // Ensure currentCardId is valid
        if (!cards.find(c => c.id === currentCardId)) {
            currentCardId = cards[0].id;
        }
    }

    applyPaySnapshot(getPayStoreSnapshot());

    function getCurrentCard() {
        return cards.find(c => c.id === currentCardId) || cards[0];
    }

    function getPayBalance() {
        return getCurrentCard().balance;
    }

    async function ensureOfficialAccounts() {
        if (!window.imData || !window.imData.friends || !window.imApp) return {};

        let officialLineteam = window.imData.friends.find(f => f.id === 'official_linetteam');
        let isDirty = false;

        if (!officialLineteam) {
            officialLineteam = window.imApp.normalizeFriendData({
                id: 'official_linetteam',
                type: 'official',
                nickname: 'Lineteam',
                realName: 'Lineteam',
                signature: 'LINE Team Official',
                avatarUrl: 'https://i.imgur.com/Kz4Y6kE.png',
                messages: []
            });
            window.imData.friends.unshift(officialLineteam);
            isDirty = true;
        }
        
        // Use formal commitment so they persist properly to DB if newly created
        if (isDirty && typeof window.imApp.commitFriendsChange === 'function') {
            await window.imApp.commitFriendsChange(() => {}, { silent: true });
        }

        return { officialLineteam };
    }

    window.getPayBalance = getPayBalance;
    window.getPayCards = function() {
        applyPaySnapshot(getPayStoreSnapshot()); // Always fetch latest from state
        return cards;
    };

    // Global API to add transactions (adds to current card or specified card)
    window.addPayTransaction = function(amount, title, type = 'income', targetCardId = null) {
        const safeAmount = Number(amount);
        if (!Number.isFinite(safeAmount) || safeAmount <= 0) return false;

        const targetCard = targetCardId 
            ? cards.find(c => c.id === targetCardId) || getCurrentCard()
            : getCurrentCard();

        if (type === 'income') {
            targetCard.balance += safeAmount;
        } else {
            targetCard.balance -= safeAmount;
        }

        const newTx = {
            id: Date.now(),
            title: title || '未知交易',
            amount: type === 'income' ? safeAmount : -safeAmount,
            time: Date.now(),
            icon: type === 'income' ? 'fa-arrow-down' : 'fa-shopping-bag',
            color: type === 'income' ? '#333' : '#666'
        };
        
        targetCard.transactions = targetCard.transactions || [];
        targetCard.transactions.unshift(newTx);
        savePayData();
        renderPayUI();

        if (window.showToast) {
            window.showToast(type === 'income' ? `已到账 ￥${safeAmount.toFixed(2)}` : `已支付 ￥${safeAmount.toFixed(2)}`);
        }

        return true;
    };

    function savePayData() {
        if (typeof window.setAppState === 'function') {
            window.setAppState('pay', {
                cards: cards,
                currentCardId: currentCardId
            });
            return;
        }

        if (window.saveGlobalData) {
            window.saveGlobalData();
        }
    }

    // --- DOM Elements ---
    const payAppBtn = document.getElementById('app-pay-btn'); // 更新为包裹整个图标的父元素 ID
    const payView = document.getElementById('pay-view');
    const appContainer = document.getElementById('app');
    const payBackBtn = document.getElementById('pay-back-btn');
    
    // Tabs
    const filterBtns = document.querySelectorAll('.pay-filter-btn');
    
    // UI Elements
    const totalAmountEl = document.getElementById('pay-total-amount');
    const billListEl = document.getElementById('pay-bill-list');
    
    // Main Card Elements
    const mainCardEl = document.getElementById('pay-main-card');
    const mainCardTitleEl = document.getElementById('pay-main-card-title');
    const mainCardTypeEl = document.getElementById('pay-main-card-type');
    const mainCardNumberEl = document.getElementById('pay-main-card-number');
    const mainCardLogoEl = document.getElementById('pay-main-card-logo');

    // Modals
    const btnScan = document.getElementById('pay-action-scan');
    const scanModal = document.getElementById('pay-scan-modal');
    const scanClose = document.getElementById('pay-scan-close');
    
    const btnCards = document.getElementById('pay-action-cards');
    const cardsSheet = document.getElementById('pay-cards-sheet');
    const bankListEl = document.getElementById('pay-bank-list');
    
    const btnFamily = document.getElementById('pay-action-family');
    const familySheet = document.getElementById('pay-family-sheet');
    const familyListEl = document.getElementById('pay-family-list');

    // --- App Launch/Close ---
    // Launch logic is now handled in HTML via onclick, but we can hook into render here
    if (payAppBtn) {
        payAppBtn.addEventListener('click', () => {
            renderPayUI();
        });
    }

    // --- Filter Switching ---
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderPayUI();
        });
    });

    // --- Render Sheet Lists ---
    function renderSheetLists() {
        if (bankListEl) {
            bankListEl.innerHTML = '';
            const bankCards = cards.filter(c => c.type === 'bank');
            bankCards.forEach(c => {
                const el = document.createElement('div');
                el.className = 'pay-bank-card';
                // Only add inline style if styleClass is empty or use class for predefined styles
                if (c.styleClass === 'bank-card-blue') {
                    el.style.background = 'linear-gradient(135deg, #0052d4 0%, #4364f7 50%, #6fb1fc 100%)';
                    el.style.color = '#fff';
                } else {
                    el.style.background = 'linear-gradient(135deg, #1c1c1e 0%, #3a3a3c 100%)';
                    el.style.color = '#fff';
                }
                
                // Active state visual cue
                if (c.id === currentCardId) {
                    el.style.border = '2px solid #34c759';
                }
                
                el.innerHTML = `
                    <div class="pay-bank-name"><i class="${c.icon}"></i> ${c.name}</div>
                    <div class="pay-bank-type">${c.cardType}</div>
                    <div class="pay-bank-number">${c.number}</div>
                    <div class="pay-bank-logo">${c.logo}</div>
                `;
                
                el.addEventListener('click', () => {
                    currentCardId = c.id;
                    savePayData();
                    renderPayUI();
                    if (window.closeView) window.closeView(cardsSheet);
                    else cardsSheet.classList.remove('active');
                });
                
                bankListEl.appendChild(el);
            });
        }
        
        if (familyListEl) {
            familyListEl.innerHTML = '';
            const familyCards = cards.filter(c => c.type === 'family');
            if (familyCards.length === 0) {
                familyListEl.innerHTML = '<div style="text-align: center; color: #8e8e93; padding: 20px 0;">暂无亲属卡</div>';
            } else {
                familyCards.forEach(c => {
                    const el = document.createElement('div');
                    el.className = 'pay-bank-card';
                    el.style.background = '#ffffff';
                    el.style.color = '#000000';
                    
                    if (c.id === currentCardId) {
                        el.style.border = '2px solid #34c759';
                    }
                    
                    el.innerHTML = `
                        <div class="pay-bank-name"><i class="${c.icon}"></i> ${c.name}</div>
                        <div class="pay-bank-type">${c.cardType}</div>
                        <div class="pay-bank-number">${c.number}</div>
                        <div class="pay-bank-logo">${c.logo}</div>
                    `;
                    
                    el.addEventListener('click', () => {
                        currentCardId = c.id;
                        savePayData();
                        renderPayUI();
                        if (window.closeView) window.closeView(familySheet);
                        else familySheet.classList.remove('active');
                    });
                    
                    familyListEl.appendChild(el);
                });
            }
        }
    }

    // --- Rendering Logic ---
    function renderPayUI() {
        const currentCard = getCurrentCard();
        
        // Render Main Card
        if (mainCardEl && currentCard) {
            mainCardEl.className = 'pay-total-card ' + (currentCard.styleClass || '');
            if (mainCardTitleEl) mainCardTitleEl.innerHTML = `<i class="${currentCard.icon}"></i> ${currentCard.name}`;
            if (mainCardTypeEl) mainCardTypeEl.textContent = currentCard.cardType;
            if (totalAmountEl) totalAmountEl.textContent = currentCard.balance.toFixed(2);
            if (mainCardNumberEl) mainCardNumberEl.textContent = currentCard.number;
            if (mainCardLogoEl) mainCardLogoEl.textContent = currentCard.logo;
        }
        
        renderSheetLists();

        // Filter Transactions
        let txs = currentCard.transactions || [];
        let filteredTxs = txs;
        if (currentFilter === 'income') {
            filteredTxs = txs.filter(tx => tx.amount > 0);
        } else if (currentFilter === 'expense') {
            filteredTxs = txs.filter(tx => tx.amount < 0);
        }

        // Render List
        if (billListEl) {
            billListEl.innerHTML = '';
            if (filteredTxs.length === 0) {
                billListEl.innerHTML = '<div class="pay-empty-state">暂无交易记录</div>';
            } else {
                filteredTxs.forEach(tx => {
                    const el = document.createElement('div');
                    el.className = 'pay-bill-item';
                    
                    const date = new Date(tx.time);
                    const timeStr = `${date.getMonth()+1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    
                    const amountStr = (tx.amount > 0 ? '+' : '') + tx.amount.toFixed(2);
                    const amountClass = tx.amount > 0 ? 'pay-positive' : '';

                    el.innerHTML = `
                        <div class="pay-bill-icon">
                            <i class="fas ${tx.icon}"></i>
                        </div>
                        <div class="pay-bill-info">
                            <div class="pay-bill-title">${tx.title}</div>
                            <div class="pay-bill-time">${timeStr}</div>
                        </div>
                        <div class="pay-bill-amount ${amountClass}">${amountStr}</div>
                    `;
                    billListEl.appendChild(el);
                });
            }
        }
    }

    // --- Modals Logic ---
    if (btnScan && scanModal) {
        btnScan.addEventListener('click', () => {
            scanModal.classList.add('active');
        });
    }

    if (scanClose && scanModal) {
        scanClose.addEventListener('click', () => {
            scanModal.classList.remove('active');
        });
    }

    if (btnCards && cardsSheet) {
        btnCards.addEventListener('click', () => {
            renderSheetLists();
            if (window.openView) window.openView(cardsSheet);
            else cardsSheet.classList.add('active');
        });
    }

    if (cardsSheet) {
        cardsSheet.addEventListener('mousedown', (e) => {
            if (e.target === cardsSheet) {
                if (window.closeView) window.closeView(cardsSheet);
                else cardsSheet.classList.remove('active');
            }
        });
    }
    
    if (btnFamily && familySheet) {
        btnFamily.addEventListener('click', () => {
            renderSheetLists();
            if (window.openView) window.openView(familySheet);
            else familySheet.classList.add('active');
        });
    }

    if (familySheet) {
        familySheet.addEventListener('mousedown', (e) => {
            if (e.target === familySheet) {
                if (window.closeView) window.closeView(familySheet);
                else familySheet.classList.remove('active');
            }
        });
    }

    // Initialize mock click for transfer to show liveliness
    const btnTransfer = document.getElementById('pay-action-transfer');
    
    // Official Accounts settings
    const officialAccountsBtn = document.getElementById('official-accounts-btn');
    const officialAccountsSheet = document.getElementById('official-accounts-sheet');

    ensureOfficialAccounts();

    if (officialAccountsBtn && officialAccountsSheet) {
        officialAccountsBtn.addEventListener('click', () => {
            ensureOfficialAccounts().then(() => {
                if (window.openView) window.openView(officialAccountsSheet);
                else officialAccountsSheet.style.display = 'flex';
            });
        });
    }
    
    if (officialAccountsSheet) {
        officialAccountsSheet.addEventListener('click', (e) => {
            if (e.target === officialAccountsSheet) {
                if (window.closeView) window.closeView(officialAccountsSheet);
                else officialAccountsSheet.style.display = 'none';
            } else {
                // Determine if a specific official account was clicked to open chat
                const item = e.target.closest('.settings-item');
                if (item) {
                    const textEl = item.querySelector('.settings-text');
                    if (textEl && window.imApp && typeof window.imApp.openChatTab === 'function') {
                        const name = textEl.textContent.trim();
                        let targetId = null;
                        if (name === 'Lineteam') targetId = 'official_linetteam';
                        
                        if (targetId) {
                            ensureOfficialAccounts().then(({ officialLineteam }) => {
                                const targetObj = officialLineteam;
                                if (targetObj) {
                                    if (window.closeView) window.closeView(officialAccountsSheet);
                                    else officialAccountsSheet.style.display = 'none';
                                    
                                    setTimeout(() => {
                                        window.imApp.openChatTab(targetObj);
                                    }, 300);
                                }
                            });
                        }
                    }
                }
            }
        });
    }
    if (btnTransfer) {
        btnTransfer.addEventListener('click', () => {
            if (window.showCustomModal) {
                window.showCustomModal({
                    type: 'prompt',
                    title: '转账给好友',
                    placeholder: '输入转账金额',
                    confirmText: '转账',
                    onConfirm: (val) => {
                        const amount = parseFloat(val);
                        if (!isNaN(amount) && amount > 0) {
                            window.addPayTransaction(amount, '转账给好友', 'expense');
                        } else {
                            if (window.showToast) window.showToast('金额无效');
                        }
                    }
                });
            }
        });
    }
});
