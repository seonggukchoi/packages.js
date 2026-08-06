# Toolkit

Perform your work intuitively without the need for searching!

This project was created to simplify conversions and value generation
that are commonly required during software development.

You don't need to visit potentially dangerous websites by Googling for Base64 encoding,
or you don't need to scour Stack Overflow to generate hash values too.

## How to Install

You only need to input one line in the shell.

```bash
npm install -g @seonggukchoi/toolkit
```

## How to Use

In the shell, run the `tk` command (an alias for the `toolkit` command).
Pass `--help` to list the commands, or to list the options of one of them.

```bash
tk --help          # every command
tk random --help   # the options of a single command
```

| Command  | What it does                                          |
| -------- | ----------------------------------------------------- |
| `random` | Generate a UUID, a random string, or a random number. |
| `encode` | Encode or decode Base64, URL and hex.                 |
| `jwt`    | Sign a JWT, or decode one.                            |
| `hash`   | Hash the input as MD5 or SHA-256.                     |
| `otp`    | Generate an OTP code from a Base32 secret.            |
| `date`   | Format a date.                                        |

Every command takes `-c` to copy its result to the clipboard.

For example, if you want to create a strong password with 32 characters,
you can simply input like this.

```bash
tk random -s -l 32 -c

# --- Result ---
# m~-{ts@6TNc}ra~N.!<#ZH_BB2DJ+F-%
#
# Copied to clipboard!
```

Also, if you want to decode a Base64 string, you can input like this.

```bash
tk encode -b VGhpcyBpcyB2ZXJ5IGVhc3kh -d

# --- Result ---
# This is very easy!
```

🧔🏻‍♂️ "THAT EASY?"

Enjoy software development by using various other features!

## License

This project is licensed under the MIT License.
And, this README.md file was partially generated with the help of GitHub Copilot.
