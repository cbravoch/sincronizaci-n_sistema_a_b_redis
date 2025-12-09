<?php

namespace Database\Factories;

use App\Models\Outbox;
use Illuminate\Database\Eloquent\Factories\Factory;

class OutboxFactory extends Factory
{
    protected $model = Outbox::class;

    public function definition()
    {
        return [
            'event_id' => $this->faker->uuid(),
            'event_type' => $this->faker->randomElement([
                'employee.created',
                'employee.updated',
                'employee.deleted',
                'department.created',
                'department.updated',
                'department.deleted',
                'skill.created',
                'skill.updated',
                'skill.deleted'
            ]),
            'aggregate_id' => $this->faker->randomNumber(),
            'aggregate_type' => $this->faker->randomElement(['employee', 'department', 'skill']),
            'version' => $this->faker->numberBetween(1, 10),
            'payload' => json_encode([
                'id' => $this->faker->randomNumber(),
                'name' => $this->faker->name(),
                'created_at' => $this->faker->dateTime()
            ]),
            'is_processed' => false,
            'created_at' => $this->faker->dateTime(),
        ];
    }
}
