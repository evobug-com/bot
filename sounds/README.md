# Sound Files Directory

This directory contains MP3 audio files that the bot plays when joining voice channels.

## Usage
Place any `.mp3` files in this directory. The bot will randomly select one of these files to play when it joins a voice channel.

## Notes
- Only `.mp3` files are supported
- The bot will join a random non-empty voice channel every 3 hours
- After playing the sound, the bot will disconnect automatically
- If no MP3 files are found, the voice connection feature will be disabled