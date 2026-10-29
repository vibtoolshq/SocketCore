"""Generate the original animated SocketCore README hero GIF (Pillow required)."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


OUTPUT = Path(__file__).with_name("socketcore-message-flow.gif")
SIZE = (960, 380)
BACKGROUND = "#101D26"
TEXT = "#F4F7F2"
MUTED = "#A9BBC0"
ACCENTS = ("#43C6D9", "#F2C14E", "#E98D65", "#78D6A5")
NODES = (
    ("CLIENT", "WebSocket", "JSON message"),
    ("ADMISSION", "Origin + identity", "Rate + capacity"),
    ("ROUTER + HANDLER", "Registered type", "Application logic"),
    ("REPLY / FAN-OUT", "Target or groups", "Metrics + buffers"),
)
NODE_X = (22, 260, 498, 736)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    filename = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / filename
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def draw_frame(frame_index: int) -> Image.Image:
    image = Image.new("RGB", SIZE, BACKGROUND)
    draw = ImageDraw.Draw(image)
    title_font = load_font(19, bold=True)
    subtitle_font = load_font(13)
    label_font = load_font(12, bold=True)
    node_font = load_font(16, bold=True)
    detail_font = load_font(12)

    draw.ellipse((775, -145, 1060, 140), fill="#142B32")
    draw.text((28, 22), "SOCKETCORE  /  REAL-TIME MESSAGE FLOW", font=title_font, fill=TEXT)
    draw.text(
        (29, 53),
        "A request enters, passes policy, reaches your handler, then returns or fans out.",
        font=subtitle_font,
        fill=MUTED,
    )

    active_node = min(3, frame_index // 4)
    for index, (title, first_detail, second_detail) in enumerate(NODES):
        x = NODE_X[index]
        accent = ACCENTS[index]
        fill = "#203943" if index == active_node else "#192B34"
        draw.rounded_rectangle((x, 125, x + 202, 237), radius=14, fill=fill)
        draw.rounded_rectangle((x, 125, x + 6, 237), radius=5, fill=accent)
        draw.text((x + 17, 142), f"0{index + 1}", font=label_font, fill=accent)
        draw.text((x + 17, 164), title, font=node_font, fill=TEXT)
        draw.text((x + 17, 192), first_detail, font=detail_font, fill=MUTED)
        draw.text((x + 17, 211), second_detail, font=detail_font, fill=MUTED)

    for index in range(3):
        start_x = NODE_X[index] + 207
        end_x = NODE_X[index + 1] - 8
        draw.line((start_x, 181, end_x - 2, 181), fill="#48616B", width=2)
        draw.polygon(
            ((end_x, 181), (end_x - 8, 176), (end_x - 8, 186)),
            fill="#83999F",
        )

    segment = frame_index // 4
    progress = (frame_index % 4) / 3
    segment_start = (236, 474, 712)[segment]
    signal_x = segment_start + progress * 20
    signal_color = Image.new("RGBA", (1, 1), ACCENTS[segment]).getpixel((0, 0))
    halo = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    halo_draw = ImageDraw.Draw(halo)
    halo_draw.ellipse((signal_x - 9, 171, signal_x + 11, 191), fill=(*signal_color[:3], 70))
    image = Image.alpha_composite(image.convert("RGBA"), halo)
    draw = ImageDraw.Draw(image)
    draw.ellipse((signal_x - 3, 177, signal_x + 5, 185), fill=ACCENTS[segment])

    chips = (
        (28, "AUTH CALLBACK DEADLINES"),
        (354, "BOUNDED BACKPRESSURE"),
        (680, "DRAIN ON SHUTDOWN"),
    )
    for x, label in chips:
        draw.rounded_rectangle((x, 277, x + 286, 309), radius=9, fill="#1A3038")
        draw.text((x + 14, 286), label, font=label_font, fill="#C7D5D4")

    draw.text(
        (28, 337),
        "APPLICATION-OWNED HANDLERS  /  OBSERVABLE TRANSPORT CORE",
        font=label_font,
        fill="#83999F",
    )
    return image.convert("P", palette=Image.Palette.ADAPTIVE, colors=256)


def main() -> None:
    frames = [draw_frame(index) for index in range(12)]
    frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=frames[1:],
        duration=140,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"Created {OUTPUT} ({len(frames)} frames at 140 ms each)")


if __name__ == "__main__":
    main()
