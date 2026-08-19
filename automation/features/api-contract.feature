@api @contract
Feature: Tourney API contract
  Invalid resource identifiers must return predictable errors.

  Scenario: Unknown tournament is not found
    When I request an unknown tournament through the API
    Then the API response status is 404

  Scenario: Unknown match score submission is not found
    When I submit a score for an unknown match through the API
    Then the API response status is 404
