import { useState } from "react"
import { useNavigate } from "react-router-dom"
import StepProgress from "./StepProgress"

const YEARS = Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i)
const LEGAL_STRUCTURES = [
  "Sole Proprietorship",
  "Partnership",
  "Corporation",
  "LLC",
  "Non-Profit",
]

export default function BusinessInfo() {
  const navigate = useNavigate()
  const [title, setTitle] = useState("Mr.")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [yearStarted, setYearStarted] = useState("")
  const [legalStructure, setLegalStructure] = useState("")
  const [country, setCountry] = useState("US")

  const canSubmit =
    firstName.trim().length > 0 &&
    businessName.trim().length > 0 &&
    yearStarted !== "" &&
    legalStructure !== ""

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    navigate("/tax-details", {
      state: { title, firstName, lastName, businessName, yearStarted, legalStructure, country },
    })
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <StepProgress current={2} total={6} />
      <h1 className="text-2xl font-bold mb-1">How will you use Tractbook?</h1>
      <p className="text-gray-500 text-sm mb-6">Tell us about you and your business</p>

      <form onSubmit={handleNext} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            What's your name? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-3 outline-none w-20"
            >
              <option>Mr.</option>
              <option>Ms.</option>
              <option>Mx.</option>
              <option>Dr.</option>
            </select>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
            />
          </div>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600 mt-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            What's your business name? <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Acme Consulting Inc."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            What year did you start your business? <span className="text-red-500">*</span>
          </label>
          <select
            value={yearStarted}
            onChange={(e) => setYearStarted(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
          >
            <option value="">Select a year...</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            What is the legal structure of your business? <span className="text-red-500">*</span>
          </label>
          <select
            value={legalStructure}
            onChange={(e) => setLegalStructure(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
          >
            <option value="">Select your business type</option>
            {LEGAL_STRUCTURES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Business country <span className="text-red-500">*</span>
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
          >
            <option value="US">USD ($) - U.S. dollar</option>
            <option value="CA">CAD ($) - Canadian dollar</option>
          </select>
        </div>

        <p className="text-xs text-gray-500">
          Looks like your business is in the {country === "CA" ? "Canada" : "United States"} and you do business in{" "}
          {country === "CA" ? "Canadian" : "U.S."} dollars.{" "}
          <a href="#" className="text-blue-600 underline">Change this.</a>
        </p>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-300 text-gray-600 rounded-lg py-3 font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 btn-glass btn-glass-primary"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  )
}
