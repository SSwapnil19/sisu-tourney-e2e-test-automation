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

