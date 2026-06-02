const groups = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?"
};

function randomIndex(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function buildPassword(length, charset) {
  let password = "";
  for (let index = 0; index < length; index += 1) {
    password += charset[randomIndex(charset.length)];
  }
  return password;
}

export function initPasswordTool() {
  const lengthInput = document.querySelector("#passwordLength");
  const lowercase = document.querySelector("#includeLowercase");
  const uppercase = document.querySelector("#includeUppercase");
  const numbers = document.querySelector("#includeNumbers");
  const symbols = document.querySelector("#includeSymbols");
  const generateButton = document.querySelector("#generatePasswordButton");
  const copyButton = document.querySelector("#copyPasswordButton");
  const output = document.querySelector("#generatedPassword");
  const message = document.querySelector("#passwordMessage");

  generateButton.addEventListener("click", () => {
    const length = Number(lengthInput.value);
    let charset = "";

    if (!Number.isInteger(length) || length < 8 || length > 128) {
      message.textContent = "Do dai phai tu 8 den 128.";
      return;
    }

    if (lowercase.checked) charset += groups.lowercase;
    if (uppercase.checked) charset += groups.uppercase;
    if (numbers.checked) charset += groups.numbers;
    if (symbols.checked) charset += groups.symbols;

    if (!charset) {
      message.textContent = "Chon it nhat mot nhom ky tu.";
      return;
    }

    output.value = buildPassword(length, charset);
    message.textContent = "Da tao mat khau.";
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      message.textContent = "Chua co mat khau de copy.";
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      message.textContent = "Da copy mat khau.";
    } catch {
      message.textContent = "Khong the copy tu dong. Hay copy thu cong.";
    }
  });
}
