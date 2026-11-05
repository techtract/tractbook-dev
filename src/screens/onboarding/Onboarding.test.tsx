import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"

vi.mock("../../lib/supabase", () => ({
  supabase: { auth: { onAuthStateChange: vi.fn(), getUser: vi.fn() }, rpc: vi.fn() },
}))

import BusinessInfo from "./BusinessInfo"
import Industry from "./Industry"

beforeEach(() => window.sessionStorage.clear())

describe("setup screens remember answers", () => {
  it("keeps the business details after leaving and coming back", async () => {
    const user = userEvent.setup()
    const first = render(<MemoryRouter><BusinessInfo /></MemoryRouter>)
    await user.type(screen.getByPlaceholderText("First name"), "Rakesh")
    await user.type(screen.getByPlaceholderText(/Acme/), "Acme Inc")
    await user.selectOptions(screen.getByLabelText(/What year did you start/), "2021")
    await user.selectOptions(screen.getByLabelText("Legal structure"), "Corporation")
    first.unmount()

    render(<MemoryRouter><BusinessInfo /></MemoryRouter>)
    expect(screen.getByPlaceholderText("First name")).toHaveValue("Rakesh")
    expect(screen.getByPlaceholderText(/Acme/)).toHaveValue("Acme Inc")
    expect(screen.getByLabelText(/What year did you start/)).toHaveValue("2021")
    expect(screen.getByLabelText("Legal structure")).toHaveValue("Corporation")
    expect(screen.getByLabelText("Business country")).toHaveValue("CA")
  })

  it("keeps the industry after going back", async () => {
    const user = userEvent.setup()
    const first = render(<MemoryRouter><Industry /></MemoryRouter>)
    await user.click(screen.getByRole("radio", { name: /Health & Wellness/ }))
    first.unmount()
    render(<MemoryRouter><Industry /></MemoryRouter>)
    expect(screen.getByRole("radio", { name: /Health & Wellness/ })).toHaveAttribute("aria-checked", "true")
  })
})
