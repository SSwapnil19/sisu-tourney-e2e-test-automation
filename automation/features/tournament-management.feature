@tournament-management
Feature: Tournament management
  Tournament configuration must create usable, internally consistent data.

  @smoke @database
  Scenario: Create a table tournament with its configured points
    Given I have unique tournament test data
    When I create a table tournament with 4 contestants and points 3, 1, 0
    Then the tournament is shown in the configuration application
    And the tournament and its 4 contestants are stored correctly
    And table matches are generated for the tournament

  @validation @database
  Scenario: A tournament cannot be created without a name
    Given I have unique tournament test data
    When I try to create a table tournament without a name
    Then the browser prevents the tournament submission
    And no tournament is stored for the test data

  @rating @integrity
  Scenario: A rating contestant cannot play against themselves
    Given I have unique tournament test data
    And a rating tournament exists with 4 contestants
    When I choose the same contestant as both players
    Then match creation is disabled with a clear explanation
    And no new rating match is stored

  @scoring @database
  Scenario: A table winner receives the configured points
    Given I have unique tournament test data
    And a table tournament exists with 4 contestants
    When I submit a valid winning score for the first pending match
    Then the score and winner are stored correctly
    And the table standings are updated exactly once in the UI and database

  @scoring @integrity @api
  Scenario: A decided table match cannot be scored twice
    Given I have unique tournament test data
    And a table match has already been scored
    When I submit a second score for the decided match through the API
    Then the API rejects the duplicate score with conflict status
    And the original result and standings remain unchanged

  @knockout @database
  Scenario: Knockout semifinal winners progress to the final
    Given I have unique tournament test data
    And a knockout tournament exists with 4 contestants
    When I score both semifinal matches
    Then the final contains exactly the two semifinal winners

  @validation @boundary @database
  Scenario: Tennis score values below the schema minimum are rejected
    Given I have unique tournament test data
    And a table tournament exists with 4 contestants
    When I enter a tennis score below the minimum value
    Then the score input exposes the Tennis schema boundaries 0 and 7
    And browser schema validation prevents score submission
    And the selected match remains pending without a stored score
