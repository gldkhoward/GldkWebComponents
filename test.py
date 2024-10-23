from music21 import stream, note, chord, instrument
import random
import mido
from mido import MidiFile
import pygame

def play_midi(midi_file):
    """Play the generated MIDI file using pygame."""
    try:
        # Initialize pygame mixer
        pygame.mixer.init()
        pygame.mixer.music.load(midi_file)

        # Play the MIDI file
        print(f"Playing: {midi_file}")
        pygame.mixer.music.play()

        # Wait for the music to finish
        while pygame.mixer.music.get_busy():
            pass  # Keep the script running until playback finishes

    except Exception as e:
        print(f"Error playing MIDI: {e}")

def generate_lofi_midi(output_file="lofi_output.mid"):
    """Generate a lofi-style MIDI sequence."""
    midi_stream = stream.Stream()

    # Function to create a random chord
    def create_random_chord():
        return chord.Chord([random.choice(["C4", "E4", "G4"]), "A4", "D5"])

    # Function to create a random note
    def create_random_note():
        return note.Note(random.choice(["E4", "G3", "C4"]), quarterLength=0.5)

    # Function to create a rest
    def create_random_rest():
        return note.Rest(quarterLength=0.25)

    # Add a random instrument to the stream
    instruments = [instrument.AcousticGuitar(), instrument.Piano(), instrument.Flute()]
    midi_stream.insert(0, random.choice(instruments))

    # Generate 16 musical elements
    offset = 0.0
    for _ in range(16):
        element_type = random.choice(["chord", "note", "rest"])
        if element_type == "chord":
            element = create_random_chord()
        elif element_type == "note":
            element = create_random_note()
        else:
            element = create_random_rest()

        element.offset = offset
        midi_stream.append(element)
        offset += element.quarterLength

    # Save the MIDI file
    midi_stream.write('midi', fp=output_file)
    print(f"MIDI file saved as: {output_file}")



if __name__ == "__main__":
    # Generate a new lofi MIDI file
    generate_lofi_midi()

    # Ask user if they want to play the MIDI file
    while True:
        response = input("Play the generated MIDI file? (y/n): ").strip().lower()
        if response == 'y':
            play_midi("lofi_output.mid")
        elif response == 'n':
            print("Exiting...")
            break
        else:
            print("Please enter 'y' or 'n'.")
