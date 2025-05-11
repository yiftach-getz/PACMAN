import pygame
import random
import sys
import os
from pygame import mixer

# Initialize Pygame
pygame.init()
mixer.init()

# Constants
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 600
GRID_SIZE = 20
PLAYER_SPEED = 3
ENEMY_SPEED = 2

# Colors
BLUE = (0, 0, 255)
RED = (255, 0, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
YELLOW = (255, 255, 0)

# Player levels
PLAYER_LEVELS = {
    "רות אלירז": {"grade": 4, "difficulty": "easy"},
    "חירות מוריה": {"grade": 5, "difficulty": "medium"},
    "יאיר אביחי": {"grade": 7, "difficulty": "hard"}
}

class Player:
    def __init__(self, name, x, y):
        self.name = name
        self.x = x
        self.y = y
        self.direction = [0, 0]
        self.lives = 3
        self.score = 0
        self.level = PLAYER_LEVELS[name]["difficulty"]
        self.trophies = 0
        self.is_champion = False

    def move(self):
        self.x += self.direction[0] * PLAYER_SPEED
        self.y += self.direction[1] * PLAYER_SPEED
        
        # Keep player within bounds
        self.x = max(0, min(self.x, WINDOW_WIDTH - GRID_SIZE))
        self.y = max(0, min(self.y, WINDOW_HEIGHT - GRID_SIZE))

    def draw(self, screen):
        pygame.draw.circle(screen, BLUE, (int(self.x), int(self.y)), GRID_SIZE // 2)
        # Draw lives
        for i in range(self.lives):
            pygame.draw.circle(screen, RED, (30 + i * 30, 30), 5)

class Enemy:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.direction = [random.choice([-1, 1]), random.choice([-1, 1])]

    def move(self):
        self.x += self.direction[0] * ENEMY_SPEED
        self.y += self.direction[1] * ENEMY_SPEED
        
        # Bounce off walls
        if self.x <= 0 or self.x >= WINDOW_WIDTH - GRID_SIZE:
            self.direction[0] *= -1
        if self.y <= 0 or self.y >= WINDOW_HEIGHT - GRID_SIZE:
            self.direction[1] *= -1

    def draw(self, screen):
        pygame.draw.circle(screen, RED, (int(self.x), int(self.y)), GRID_SIZE // 2)

class Food:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.collected = False

    def draw(self, screen):
        if not self.collected:
            pygame.draw.circle(screen, WHITE, (int(self.x), int(self.y)), 3)

class MathQuestion:
    def __init__(self, difficulty):
        self.difficulty = difficulty
        self.generate_question()

    def generate_question(self):
        if self.difficulty == "easy":
            # Simple addition/subtraction up to 20
            self.num1 = random.randint(1, 10)
            self.num2 = random.randint(1, 10)
            self.operation = random.choice(['+', '-'])
            if self.operation == '+':
                self.answer = self.num1 + self.num2
            else:
                self.answer = self.num1 - self.num2
        elif self.difficulty == "medium":
            # Multiplication tables up to 10
            self.num1 = random.randint(1, 10)
            self.num2 = random.randint(1, 10)
            self.operation = '*'
            self.answer = self.num1 * self.num2
        else:  # hard
            # More complex operations
            self.num1 = random.randint(10, 20)
            self.num2 = random.randint(1, 10)
            self.operation = random.choice(['+', '-', '*'])
            if self.operation == '+':
                self.answer = self.num1 + self.num2
            elif self.operation == '-':
                self.answer = self.num1 - self.num2
            else:
                self.answer = self.num1 * self.num2

    def get_question_text(self):
        return f"{self.num1} {self.operation} {self.num2} = ?"

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption("Math Pacman")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 36)
        self.champion_font = pygame.font.Font(None, 48)
        self.current_player = None
        self.enemies = []
        self.food = []
        self.question = None
        self.showing_question = False
        self.user_answer = ""
        self.champion_sound = mixer.Sound("champion.wav")
        self.setup_game()

    def setup_game(self):
        # Create player
        self.current_player = Player("רות אלירז", WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2)
        
        # Create enemies
        for _ in range(3):
            x = random.randint(0, WINDOW_WIDTH - GRID_SIZE)
            y = random.randint(0, WINDOW_HEIGHT - GRID_SIZE)
            self.enemies.append(Enemy(x, y))
        
        # Create food
        for _ in range(20):
            x = random.randint(0, WINDOW_WIDTH - GRID_SIZE)
            y = random.randint(0, WINDOW_HEIGHT - GRID_SIZE)
            self.food.append(Food(x, y))

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    return False
                
                if self.showing_question:
                    if event.key == pygame.K_RETURN:
                        try:
                            answer = int(self.user_answer)
                            if answer == self.question.answer:
                                self.current_player.score += 10
                                if self.current_player.score % 50 == 0:
                                    self.current_player.trophies += 1
                                    self.current_player.is_champion = True
                                    self.champion_sound.play()
                            else:
                                self.current_player.lives -= 1
                        except ValueError:
                            pass
                        self.showing_question = False
                        self.user_answer = ""
                    elif event.key == pygame.K_BACKSPACE:
                        self.user_answer = self.user_answer[:-1]
                    else:
                        self.user_answer += event.unicode
                else:
                    if event.key == pygame.K_LEFT:
                        self.current_player.direction = [-1, 0]
                    elif event.key == pygame.K_RIGHT:
                        self.current_player.direction = [1, 0]
                    elif event.key == pygame.K_UP:
                        self.current_player.direction = [0, -1]
                    elif event.key == pygame.K_DOWN:
                        self.current_player.direction = [0, 1]
        
        return True

    def update(self):
        if not self.showing_question:
            self.current_player.move()
            for enemy in self.enemies:
                enemy.move()
                
                # Check collision with enemy
                if (abs(self.current_player.x - enemy.x) < GRID_SIZE and 
                    abs(self.current_player.y - enemy.y) < GRID_SIZE):
                    self.question = MathQuestion(self.current_player.level)
                    self.showing_question = True

            # Check collision with food
            for food in self.food:
                if not food.collected:
                    if (abs(self.current_player.x - food.x) < GRID_SIZE and 
                        abs(self.current_player.y - food.y) < GRID_SIZE):
                        food.collected = True
                        self.current_player.score += 1
                        if self.current_player.score % 10 == 0:
                            self.current_player.lives = min(3, self.current_player.lives + 1)

    def draw(self):
        self.screen.fill(BLACK)
        
        # Draw food
        for food in self.food:
            food.draw(self.screen)
        
        # Draw enemies
        for enemy in self.enemies:
            enemy.draw(self.screen)
        
        # Draw player
        self.current_player.draw(self.screen)
        
        # Draw score
        score_text = self.font.render(f"Score: {self.current_player.score}", True, WHITE)
        self.screen.blit(score_text, (WINDOW_WIDTH - 150, 30))
        
        # Draw player name
        if self.current_player.is_champion:
            name_text = self.champion_font.render(self.current_player.name, True, YELLOW)
            self.screen.blit(name_text, (WINDOW_WIDTH // 2 - 100, 50))
        else:
            name_text = self.font.render(self.current_player.name, True, WHITE)
            self.screen.blit(name_text, (WINDOW_WIDTH // 2 - 100, 50))
        
        # Draw trophies
        for i in range(self.current_player.trophies):
            trophy_text = self.font.render("🏆", True, YELLOW)
            self.screen.blit(trophy_text, (WINDOW_WIDTH - 150, 70 + i * 30))
        
        # Draw question if showing
        if self.showing_question:
            question_text = self.font.render(self.question.get_question_text(), True, WHITE)
            answer_text = self.font.render(self.user_answer, True, WHITE)
            self.screen.blit(question_text, (WINDOW_WIDTH // 2 - 100, WINDOW_HEIGHT // 2))
            self.screen.blit(answer_text, (WINDOW_WIDTH // 2 - 100, WINDOW_HEIGHT // 2 + 40))
        
        pygame.display.flip()

    def run(self):
        running = True
        while running:
            running = self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(60)

if __name__ == "__main__":
    game = Game()
    game.run()
    pygame.quit()
    sys.exit() 