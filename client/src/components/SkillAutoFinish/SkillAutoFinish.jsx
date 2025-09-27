import React, { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import api from "../../utils/axios";

const SkillAutoFinish = ({
  value = "",
  onChange,
  placeholder = "Search for skills...",
  label = "Skills",
  className = "",
  disabled = false,
  required = false,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [skillTags, setSkillTags] = useState([]);

  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize skill tags from value
  useEffect(() => {
    if (value && typeof value === "string") {
      const skills = value
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);
      setSkillTags(skills);
    } else {
      setSkillTags([]);
    }
  }, [value]);

  // Search for skills
  const searchSkills = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(
        `/api/contacts/search-skills/?q=${encodeURIComponent(query)}`
      );

      if (response.data.success) {
        // Filter out skills that are already selected
        const filteredSuggestions = response.data.data.filter(
          (skill) =>
            !skillTags.some(
              (existingSkill) =>
                existingSkill.toLowerCase() === skill.toLowerCase()
            )
        );
        setSuggestions(filteredSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error searching skills:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSkills(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, skillTags]);

  // Handle input change
  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchTerm(query);
    setShowSuggestions(true);
  };

  // Handle skill selection
  const handleSkillSelect = (skill) => {
    const newSkills = [...skillTags, skill];
    setSkillTags(newSkills);
    setSearchTerm("");
    setSuggestions([]);
    setShowSuggestions(false);

    // Update parent component
    const skillsString = newSkills.join(", ");
    onChange(skillsString);
  };

  // Handle skill removal
  const handleSkillRemove = (skillToRemove) => {
    const newSkills = skillTags.filter((skill) => skill !== skillToRemove);
    setSkillTags(newSkills);

    // Update parent component
    const skillsString = newSkills.join(", ");
    onChange(skillsString);
  };

  // Handle adding custom skill on Enter or comma
  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && searchTerm.trim()) {
      e.preventDefault();
      const skill = searchTerm.trim();

      if (!skillTags.includes(skill)) {
        handleSkillSelect(skill);
      } else {
        setSearchTerm("");
      }
    } else if (e.key === "Backspace" && !searchTerm && skillTags.length > 0) {
      // Remove last skill if backspace is pressed and input is empty
      const newSkills = skillTags.slice(0, -1);
      setSkillTags(newSkills);
      const skillsString = newSkills.join(", ");
      onChange(skillsString);
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div
        className={`relative flex flex-wrap items-center gap-1 p-2 border border-gray-300 rounded-md min-h-[40px] bg-white ${
          disabled ? "bg-gray-50 cursor-not-allowed" : "cursor-text"
        } focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500`}
      >
        {/* Skill Tags */}
        {skillTags.map((skill, index) => (
          <div
            key={index}
            className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
          >
            <span>{skill}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleSkillRemove(skill)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={
            skillTags.length === 0 ? placeholder : "Add more skills..."
          }
          disabled={disabled}
          className="flex-1 min-w-[120px] border-none outline-none bg-transparent text-sm"
        />

        {/* Loading indicator */}
        {loading && (
          <div className="flex-shrink-0">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && searchTerm.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.length > 0 ? (
            <>
              {suggestions.map((skill, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSkillSelect(skill)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 text-sm border-b border-gray-100 last:border-b-0"
                >
                  {skill}
                </button>
              ))}
            </>
          ) : searchTerm.length >= 2 && !loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-green-600" />
                <span>
                  Press Enter or comma to add "{searchTerm}" as a new skill
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SkillAutoFinish;
