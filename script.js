const textList = document.getElementById("textList");
const totalText = document.getElementById("totalText");
const toast = document.getElementById("toast");
const addForm = document.getElementById("addForm");
const newTextInput = document.getElementById("newTextInput");
const resetBtn = document.getElementById("resetBtn");
const copyTimerBar = document.getElementById("copyTimerBar");
const copyTimerValue = document.getElementById("copyTimerValue");
const dayButtons = document.getElementById("dayButtons");

const COPY_COOLDOWN_SECONDS = 10;
const TESTIMONI_FOLDER = "testimoni";

let baseTexts = [];
let sessionTexts = [];
let allTexts = [];
let removedBaseIndexes = new Set();
let copyCooldownRemaining = 0;
let copyCooldownInterval = null;

function init() {
    refreshTexts();
}

function getTestimoniFileName(dayName) {
    return `Testimoni ${dayName}.txt`;
}

async function loadTestimoniDay(dayName, button) {
    if (button) {
        button.classList.add("loading");
    }

    try {
        const fileName = getTestimoniFileName(dayName);
        const response = await fetch(`${TESTIMONI_FOLDER}/${encodeURIComponent(fileName)}`);

        if (!response.ok) {
            throw new Error("File tidak ditemukan");
        }

        const texts = parseInputTexts(await response.text());

        if (texts.length === 0) {
            showToast(`File ${dayName} kosong`);
            return;
        }

        sessionTexts.push(...texts);
        refreshTexts();
        showToast(`${texts.length} teks ${dayName} ditambahkan`);
    } catch (error) {
        showToast("Buka lewat Live Server agar file testimoni terbaca");
    } finally {
        if (button) {
            button.classList.remove("loading");
        }
    }
}

dayButtons.addEventListener("click", (event) => {
    const button = event.target.closest(".day-btn");

    if (!button) {
        return;
    }

    loadTestimoniDay(button.dataset.day, button);
});

function getAllTextItems() {
    const items = [];

    baseTexts.forEach((text, index) => {
        if (!removedBaseIndexes.has(index)) {
            items.push({ text, source: "base", sourceIndex: index });
        }
    });

    sessionTexts.forEach((text, index) => {
        items.push({ text, source: "session", sourceIndex: index });
    });

    return items;
}

function refreshTexts() {
    allTexts = getAllTextItems();
    totalText.textContent = allTexts.length;
    renderTexts();
}

function renderTexts() {
    textList.innerHTML = "";

    if (allTexts.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Belum ada teks. Pilih hari di atas atau tambah manual";
        textList.appendChild(empty);
        return;
    }

    allTexts.forEach((item, index) => {
        const isSessionText = item.source === "session";
        const card = document.createElement("div");
        card.className = "text-card";

        const number = document.createElement("div");
        number.className = "number";
        number.textContent = index + 1;

        const content = document.createElement("div");
        content.className = "text-content";

        const paragraph = document.createElement("p");
        paragraph.textContent = item.text;

        const actions = document.createElement("div");
        actions.className = "card-actions";

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "copy-btn";
        copyButton.textContent = "Salin";
        copyButton.addEventListener("click", () => {
            copyText(item);
        });

        actions.appendChild(copyButton);

        if (isSessionText) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "delete-btn";
            deleteButton.textContent = "Hapus";
            deleteButton.addEventListener("click", () => {
                removeTextItem(item);
                showToast("Teks dihapus");
            });
            actions.appendChild(deleteButton);
        }

        content.appendChild(paragraph);

        card.appendChild(number);
        card.appendChild(content);
        card.appendChild(actions);

        textList.appendChild(card);
    });

    updateCopyButtonsState();
}

function isCopyCooldownActive() {
    return copyCooldownRemaining > 0;
}

function updateCopyCooldownUI() {
    copyTimerValue.textContent = copyCooldownRemaining;
}

function updateCopyButtonsState() {
    const disabled = isCopyCooldownActive();

    document.querySelectorAll(".copy-btn").forEach((button) => {
        button.disabled = disabled;
        button.classList.toggle("disabled", disabled);
    });
}

function startCopyCooldown() {
    copyCooldownRemaining = COPY_COOLDOWN_SECONDS;
    copyTimerBar.classList.add("active");
    updateCopyCooldownUI();
    updateCopyButtonsState();

    clearInterval(copyCooldownInterval);

    copyCooldownInterval = setInterval(() => {
        copyCooldownRemaining -= 1;
        updateCopyCooldownUI();

        if (copyCooldownRemaining <= 0) {
            clearInterval(copyCooldownInterval);
            copyCooldownInterval = null;
            copyTimerBar.classList.remove("active");
            updateCopyButtonsState();
        }
    }, 1000);
}

function cleanInputLine(line) {
    return line
        .replace(/[\u200B-\u200D\u200E\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
        .replace(/^\s*\d+\.\s*/, "")
        .trim();
}

function parseInputTexts(rawInput) {
    return rawInput
        .split(/\r?\n/)
        .map(cleanInputLine)
        .filter(Boolean);
}

function removeTextItem(item) {
    if (item.source === "base") {
        removedBaseIndexes.add(item.sourceIndex);
    } else {
        sessionTexts.splice(item.sourceIndex, 1);
    }

    refreshTexts();
}

addForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const rawInput = newTextInput.value.trim();

    if (!rawInput) {
        showToast("Tulis teks dulu");
        return;
    }

    const newTexts = parseInputTexts(rawInput);

    if (newTexts.length === 0) {
        showToast("Teks tidak valid");
        return;
    }

    sessionTexts.push(...newTexts);
    newTextInput.value = "";
    refreshTexts();
});

function resetTexts() {
    baseTexts = [];
    sessionTexts = [];
    allTexts = [];
    removedBaseIndexes = new Set();
    newTextInput.value = "";
    copyCooldownRemaining = 0;
    clearInterval(copyCooldownInterval);
    copyCooldownInterval = null;
    copyTimerBar.classList.remove("active");
    refreshTexts();
}

resetBtn.addEventListener("click", resetTexts);

async function copyText(item) {
    if (isCopyCooldownActive()) {
        showToast("Tunggu timer selesai dulu");
        return;
    }

    const text = item.text;

    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        const textarea = document.createElement("textarea");

        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.select();

        document.execCommand("copy");
        textarea.remove();
    }

    removeTextItem(item);
    startCopyCooldown();
    showToast("Teks disalin dan dihapus");
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 1800);
}

init();